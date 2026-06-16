/**
 * GenMedia Hub — Firebase Cloud Functions
 * Authenticated proxy to Cloud Run MCP servers + persistence endpoints.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuth = new GoogleAuth();

const SERVER_ALIASES = {
  'genmedia-veo': 'mcp-veo',
  'genmedia-nanobanana': 'mcp-nanobanana',
  'genmedia-lyria': 'mcp-lyria',
  'genmedia-chirp3': 'mcp-chirp3',
  'genmedia-gemini': 'mcp-gemini',
  'genmedia-avtool': 'mcp-avtool',
  'gstack-mcp': 'gstack-mcp',
};

const MCP_SERVERS = {
  'gstack-mcp': {
    url: 'https://gstack-mcp-128509221012.us-central1.run.app',
    description: 'Google Stack MCP — Sheets, Docs, Drive, Gmail, Calendar',
  },
  'mcp-veo': {
    url: 'https://mcp-veo-128509221012.us-central1.run.app',
    description: 'Veo MCP — Video generation via Google Veo',
  },
  'mcp-nanobanana': {
    url: 'https://mcp-nanobanana-128509221012.us-central1.run.app',
    description: 'NanoBanana MCP — Image generation and manipulation',
  },
  'mcp-lyria': {
    url: 'https://mcp-lyria-128509221012.us-central1.run.app',
    description: 'Lyria MCP — Music generation via Google Lyria',
  },
  'mcp-avtool': {
    url: 'https://mcp-avtool-128509221012.us-central1.run.app',
    description: 'AV Tool MCP — Audio/video processing utilities',
  },
};

const LOCAL_ONLY_SERVERS = {
  'mcp-chirp3': 'chirp3 not available via cloud',
  'mcp-gemini': 'gemini not available via cloud',
};

async function getIdentityToken(targetUrl) {
  const client = await googleAuth.getIdTokenClient(targetUrl);
  const headers = await client.getRequestHeaders();
  return headers.Authorization;
}

async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Missing or malformed Authorization header');
    error.statusCode = 401;
    throw error;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    return await auth.verifyIdToken(idToken);
  } catch (err) {
    const error = new Error(`Invalid token: ${err.message}`);
    error.statusCode = 401;
    throw error;
  }
}

async function forwardToCloudRun(serverUrl, tool, params, existingSessionId = null) {
  const fullUrl = `${serverUrl}/mcp`;
  const authHeader = await getIdentityToken(fullUrl);
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': authHeader };

  let sessionId = existingSessionId;
  if (!sessionId) {
    const initResponse = await fetch(fullUrl, {
      method: 'POST', headers,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 0, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'genmedia-hub', version: '1.0' } },
      }),
    });
    if (!initResponse.ok) {
      const errorText = await initResponse.text().catch(() => 'Unknown error');
      const error = new Error(`MCP init failed (${initResponse.status}): ${errorText}`);
      error.statusCode = 502;
      throw error;
    }
    sessionId = initResponse.headers.get('mcp-session-id');
  }

  const callHeaders = { ...headers };
  if (sessionId) callHeaders['Mcp-Session-Id'] = sessionId;

  const response = await fetch(fullUrl, {
    method: 'POST', headers: callHeaders,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: params } }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    const error = new Error(`MCP server returned ${response.status}: ${errorText}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();
  if (data.error) {
    const error = new Error(data.error.message || 'MCP server error');
    error.statusCode = 500;
    error.mcpError = data.error;
    throw error;
  }
  return { result: data.result || data, sessionId };
}

// Generate a short title from the first prompt
function generateTitle(prompt) {
  if (!prompt) return 'New Session';
  const clean = prompt.replace(/\n/g, ' ').trim();
  return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
}

// Detect media type from MCP result content
function detectMediaType(result) {
  const content = result?.content || [];
  for (const block of content) {
    if (block.type === 'image') return 'image';
    if (block.type === 'resource' && block.mimeType?.startsWith('audio')) return 'audio';
    if (block.type === 'resource' && block.mimeType?.startsWith('video')) return 'video';
  }
  return 'text';
}

// ─── API Router ──────────────────────────────────────────────────────────────

export const mcpProxy = onRequest(
  { region: 'us-central1', memory: '1GiB', timeoutSeconds: 120, maxInstances: 50, cors: true, invoker: 'public' },
  async (req, res) => {
    // Route based on method + path
    const path = req.path.replace(/^\/api/, '').replace(/\/$/, '');

    try {
      if (path.startsWith('/sessions') && req.method === 'GET') {
        return await handleGetSessions(req, res, path);
      }
      if (path.startsWith('/sessions') && req.method === 'DELETE') {
        return await handleDeleteSession(req, res, path);
      }
      if (path.startsWith('/generations') && req.method === 'GET') {
        return await handleGetGenerations(req, res);
      }
      if ((path === '/mcp' || path === '') && req.method === 'POST') {
        return await handleMcpCall(req, res);
      }
      // Fallback: treat POST to any path as MCP call
      if (req.method === 'POST') {
        return await handleMcpCall(req, res);
      }
      res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error(`[mcpProxy] Error (${statusCode}):`, error.message);
      res.status(statusCode).json({ success: false, error: error.message, ...(error.mcpError ? { mcpError: error.mcpError } : {}) });
    }
  }
);

// ─── GET /api/sessions and GET /api/sessions/:id ─────────────────────────────

async function handleGetSessions(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;

  // Check if requesting a specific session: /sessions/:id
  const match = path.match(/^\/sessions\/(.+)$/);
  if (match) {
    const sessionId = match[1];
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const messagesSnap = await db.collection('sessions').doc(sessionId)
      .collection('messages').orderBy('timestamp', 'asc').get();
    const messages = messagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.status(200).json({ session: { id: sessionDoc.id, ...sessionDoc.data() }, messages });
    return;
  }

  // List sessions
  const pageSize = parseInt(req.query.limit) || 50;
  const sessionsQuery = db.collection('sessions')
    .where('userId', '==', userId)
    .where('deleted', '!=', true)
    .orderBy('updatedAt', 'desc')
    .limit(pageSize);

  const snap = await sessionsQuery.get();
  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.status(200).json({ sessions });
}

// ─── DELETE /api/sessions/:id ────────────────────────────────────────────────

async function handleDeleteSession(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;
  const match = path.match(/^\/sessions\/(.+)$/);
  if (!match) { res.status(400).json({ error: 'Session ID required' }); return; }

  const sessionId = match[1];
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await sessionRef.update({ deleted: true, updatedAt: FieldValue.serverTimestamp() });
  res.status(200).json({ success: true });
}

// ─── GET /api/generations ────────────────────────────────────────────────────

async function handleGetGenerations(req, res) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;
  const pageSize = parseInt(req.query.limit) || 50;
  const server = req.query.server;
  const tool = req.query.tool;

  let q = db.collection('generations').where('userId', '==', userId);
  if (server) q = q.where('serverId', '==', server);
  if (tool) q = q.where('toolId', '==', tool);
  q = q.orderBy('createdAt', 'desc').limit(pageSize);

  const snap = await q.get();
  const generations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.status(200).json({ generations });
}

// ─── POST /api/mcp — Tool call with persistence ─────────────────────────────

async function handleMcpCall(req, res) {
  const startTime = Date.now();
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;

  let { server, tool, params = {}, sessionId: clientSessionId } = req.body;
  if (!server || !tool) {
    const pathParts = req.path.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      server = pathParts[pathParts.length - 2];
      tool = pathParts[pathParts.length - 1];
      params = req.body;
    }
  }

  server = SERVER_ALIASES[server] || server;

  if (!server || typeof server !== 'string') {
    res.status(400).json({ error: 'Missing required field: "server"', availableServers: [...Object.keys(MCP_SERVERS), ...Object.keys(LOCAL_ONLY_SERVERS)] });
    return;
  }
  if (!tool || typeof tool !== 'string') {
    res.status(400).json({ error: 'Missing required field: "tool"' });
    return;
  }
  if (LOCAL_ONLY_SERVERS[server]) {
    res.status(400).json({ error: LOCAL_ONLY_SERVERS[server], server });
    return;
  }
  const serverConfig = MCP_SERVERS[server];
  if (!serverConfig) {
    res.status(400).json({ error: `Unknown server: "${server}"`, availableServers: Object.keys(MCP_SERVERS) });
    return;
  }

  const cleanParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) cleanParams[k] = v;
  }

  // Determine prompt text for persistence
  const promptText = cleanParams.description || cleanParams.prompt || cleanParams.response || Object.values(cleanParams)[0] || '';

  // Resolve or create session
  let firestoreSessionId = clientSessionId || null;
  let existingMcpSessionId = null;

  if (firestoreSessionId) {
    // Resume existing session — get its mcpSessionId
    const sessionDoc = await db.collection('sessions').doc(firestoreSessionId).get();
    if (sessionDoc.exists && sessionDoc.data().userId === userId) {
      existingMcpSessionId = sessionDoc.data().mcpSessionId || null;
    }
  }

  // Forward to Cloud Run
  console.log(`[mcpProxy] uid=${userId} server=${server} tool=${tool}`);
  const { result, sessionId: mcpSessionId } = await forwardToCloudRun(serverConfig.url, tool, cleanParams, existingMcpSessionId);
  const duration = Date.now() - startTime;

  // Persist session
  if (!firestoreSessionId) {
    // Create new session
    const sessionRef = await db.collection('sessions').add({
      userId,
      serverId: server,
      toolId: tool,
      mcpSessionId: mcpSessionId || null,
      title: generateTitle(promptText),
      status: 'active',
      deleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessage: promptText.slice(0, 100),
    });
    firestoreSessionId = sessionRef.id;
  } else {
    // Update existing session
    await db.collection('sessions').doc(firestoreSessionId).update({
      mcpSessionId: mcpSessionId || FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessage: promptText.slice(0, 100),
    });
  }

  // Save user message
  await db.collection('sessions').doc(firestoreSessionId).collection('messages').add({
    role: 'user',
    content: promptText,
    timestamp: FieldValue.serverTimestamp(),
    metadata: {},
  });

  // Save agent response
  const content = result?.content || [];
  const textContent = content.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
  await db.collection('sessions').doc(firestoreSessionId).collection('messages').add({
    role: 'agent',
    content: textContent,
    contentBlocks: content,
    timestamp: FieldValue.serverTimestamp(),
    metadata: { duration, model: server },
  });

  // Save generation record
  const mediaType = detectMediaType(result);
  await db.collection('generations').add({
    userId,
    serverId: server,
    toolId: tool,
    prompt: promptText,
    result,
    mediaType,
    mediaUrl: null,
    createdAt: FieldValue.serverTimestamp(),
    sessionId: firestoreSessionId,
    status: 'completed',
    duration,
  });

  res.status(200).json({
    success: true,
    server,
    tool,
    result,
    sessionId: firestoreSessionId,
    mcpSessionId: mcpSessionId || null,
    meta: { duration, timestamp: new Date().toISOString() },
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────

export const health = onRequest(
  { region: 'us-central1', memory: '128MiB', timeoutSeconds: 10, maxInstances: 10 },
  async (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'genmedia-hub-functions',
      timestamp: new Date().toISOString(),
      servers: { cloud: Object.keys(MCP_SERVERS), localOnly: Object.keys(LOCAL_ONLY_SERVERS) },
    });
  }
);
