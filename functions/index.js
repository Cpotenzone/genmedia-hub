/**
 * GenMedia Hub — Firebase Cloud Functions
 * Authenticated proxy to Cloud Run MCP servers + persistence endpoints.
 * Includes async job queue, admin panel, request logging, and response caching.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { Logging } from '@google-cloud/logging';
import { createHash } from 'crypto';

const app = initializeApp({ projectId: 'casey-genmedia' });
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuth = new GoogleAuth();
const storage = new Storage({ projectId: 'casey-genmedia' });
const mediaBucket = storage.bucket('casey-genmedia-output');
const logging = new Logging({ projectId: 'casey-genmedia' });

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

// Media servers default to async mode
const ASYNC_DEFAULT_SERVERS = new Set(['mcp-veo', 'mcp-nanobanana', 'mcp-lyria', 'mcp-avtool']);

// Admin emails
const ADMIN_EMAILS = ['casey@criticalasset.com', 'casey@insuremep.com'];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

async function verifyAdmin(req) {
  const decodedToken = await verifyAuthToken(req);
  if (!isAdmin(decodedToken.email)) {
    const error = new Error('Forbidden: admin access required');
    error.statusCode = 403;
    throw error;
  }
  return decodedToken;
}

// Cache helpers
function computeCacheKey(serverId, toolId, params) {
  const raw = JSON.stringify({ serverId, toolId, params });
  return createHash('sha256').update(raw).digest('hex');
}

async function getCachedResult(serverId, toolId, params) {
  const hash = computeCacheKey(serverId, toolId, params);
  const doc = await db.collection('cache').doc(hash).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.expiresAt && data.expiresAt.toDate() < new Date()) return null;
  await db.collection('cache').doc(hash).update({ hitCount: FieldValue.increment(1) });
  return data.result;
}

async function setCachedResult(serverId, toolId, params, result) {
  const hash = computeCacheKey(serverId, toolId, params);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  await db.collection('cache').doc(hash).set({
    serverId, toolId, paramsHash: hash, result,
    createdAt: now, expiresAt, hitCount: 0,
  });
}

// Request logging helper
async function logRequest({ userId, userEmail, userName, serverId, toolId, params, result, status, errorMessage, duration, sessionId, jobId }) {
  const resultStr = JSON.stringify(result || '');
  await db.collection('requests').add({
    userId, userEmail: userEmail || '', userName: userName || '',
    serverId, toolId, params: params || {},
    result: result || null,
    status, errorMessage: errorMessage || null,
    duration: duration || 0,
    timestamp: FieldValue.serverTimestamp(),
    sessionId: sessionId || null,
    jobId: jobId || null,
    responseSize: resultStr.length,
  });
}

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

function generateTitle(prompt) {
  if (!prompt) return 'New Session';
  const clean = prompt.replace(/\n/g, ' ').trim();
  return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
}

function detectMediaType(result) {
  const content = result?.content || [];
  for (const block of content) {
    if (block.type === 'image') return 'image';
    if (block.type === 'resource' && block.mimeType?.startsWith('audio')) return 'audio';
    if (block.type === 'resource' && block.mimeType?.startsWith('video')) return 'video';
  }
  return 'text';
}

function getMimeAndExt(mediaType, block) {
  if (mediaType === 'image') return { mime: block?.mimeType || 'image/png', ext: (block?.mimeType || 'image/png').split('/')[1] || 'png' };
  if (mediaType === 'audio') return { mime: block?.mimeType || 'audio/wav', ext: (block?.mimeType || 'audio/wav').split('/')[1] || 'wav' };
  if (mediaType === 'video') return { mime: block?.mimeType || 'video/mp4', ext: (block?.mimeType || 'video/mp4').split('/')[1] || 'mp4' };
  return { mime: 'application/octet-stream', ext: 'bin' };
}

async function uploadMediaToGCS(result, userId, generationId) {
  const content = result?.content || [];
  const mediaType = detectMediaType(result);
  if (mediaType === 'text') return null;

  // Find the media block
  let block = null;
  let base64Data = null;
  for (const b of content) {
    if (b.type === 'image' && b.data) { block = b; base64Data = b.data; break; }
    if (b.type === 'resource' && b.resource?.blob) { block = b; base64Data = b.resource.blob; break; }
    if (b.type === 'resource' && b.blob) { block = b; base64Data = b.blob; break; }
  }
  if (!base64Data) return null;

  const { mime, ext } = getMimeAndExt(mediaType, block);
  const gcsPath = `generations/${userId}/${generationId}.${ext}`;
  const file = mediaBucket.file(gcsPath);
  const buffer = Buffer.from(base64Data, 'base64');

  await file.save(buffer, { contentType: mime, metadata: { cacheControl: 'public, max-age=31536000' } });

  return {
    mediaUrl: `gs://casey-genmedia-output/${gcsPath}`,
    mediaType: mime,
    mediaSizeBytes: buffer.length,
  };
}

// ─── Firestore-triggered Job Processor ───────────────────────────────────────

export const processJob = onDocumentCreated(
  { document: 'jobs/{jobId}', region: 'us-central1', memory: '1GiB', timeoutSeconds: 300 },
  async (event) => {
    const jobId = event.params.jobId;
    const job = event.data.data();
    const jobRef = db.collection('jobs').doc(jobId);

    // Update status to processing
    await jobRef.update({ status: 'processing', startedAt: FieldValue.serverTimestamp() });

    const server = SERVER_ALIASES[job.serverId] || job.serverId;
    const serverConfig = MCP_SERVERS[server];

    if (!serverConfig) {
      await jobRef.update({ status: 'failed', error: `Unknown server: ${server}`, completedAt: FieldValue.serverTimestamp() });
      return;
    }

    try {
      const { result, sessionId: mcpSessionId } = await forwardToCloudRun(serverConfig.url, job.toolId, job.params || {});

      // Update job with result
      await jobRef.update({
        status: 'completed',
        result,
        mcpSessionId: mcpSessionId || null,
        completedAt: FieldValue.serverTimestamp(),
      });

      // Create generation record
      const promptText = job.params?.description || job.params?.prompt || job.params?.response || Object.values(job.params || {})[0] || '';
      const mediaType = detectMediaType(result);
      const genRef = db.collection('generations').doc();
      const generationId = genRef.id;

      // Upload media to GCS if binary content exists
      let mediaInfo = { mediaUrl: null, mediaType: mediaType, mediaSizeBytes: null };
      try {
        const uploaded = await uploadMediaToGCS(result, job.userId, generationId);
        if (uploaded) mediaInfo = uploaded;
      } catch (uploadErr) {
        console.error(`[processJob] GCS upload failed for ${jobId}:`, uploadErr.message);
      }

      await genRef.set({
        userId: job.userId,
        serverId: server,
        toolId: job.toolId,
        prompt: promptText,
        result,
        mediaUrl: mediaInfo.mediaUrl,
        mediaType: mediaInfo.mediaType,
        mediaSizeBytes: mediaInfo.mediaSizeBytes,
        createdAt: FieldValue.serverTimestamp(),
        deletedAt: null,
        sessionId: job.sessionId || null,
        status: 'completed',
        duration: null,
        jobId,
      });

      // If there's a session, save messages
      if (job.sessionId) {
        const sessionRef = db.collection('sessions').doc(job.sessionId);
        await sessionRef.update({ updatedAt: FieldValue.serverTimestamp(), lastMessage: promptText.slice(0, 100) });
        await sessionRef.collection('messages').add({
          role: 'user', content: promptText, timestamp: FieldValue.serverTimestamp(), metadata: {},
        });
        const content = result?.content || [];
        const textContent = content.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
        await sessionRef.collection('messages').add({
          role: 'agent', content: textContent, contentBlocks: content, timestamp: FieldValue.serverTimestamp(), metadata: { model: server },
        });
      }
    } catch (err) {
      console.error(`[processJob] Job ${jobId} failed:`, err.message);
      await jobRef.update({
        status: 'failed',
        error: err.message || 'Unknown error',
        completedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);

// ─── API Router ──────────────────────────────────────────────────────────────

export const mcpProxy = onRequest(
  { region: 'us-central1', memory: '1GiB', timeoutSeconds: 120, maxInstances: 50, cors: true, invoker: 'public' },
  async (req, res) => {
    const path = req.path.replace(/^\/api/, '').replace(/\/$/, '');

    try {
      if (path.startsWith('/admin/')) {
        return await handleAdminRoutes(req, res, path);
      }
      if (path.startsWith('/jobs') && req.method === 'GET') {
        return await handleGetJobs(req, res, path);
      }
      if (path.startsWith('/sessions') && req.method === 'GET') {
        return await handleGetSessions(req, res, path);
      }
      if (path.startsWith('/sessions') && req.method === 'DELETE') {
        return await handleDeleteSession(req, res, path);
      }
      if (path.startsWith('/generations') && req.method === 'DELETE') {
        return await handleSoftDeleteGeneration(req, res, path);
      }
      if (path.startsWith('/generations') && req.method === 'GET') {
        return await handleGetGenerations(req, res);
      }
      if (path.startsWith('/media/') && req.method === 'GET') {
        return await handleGetMedia(req, res, path);
      }
      if ((path === '/mcp' || path === '') && req.method === 'POST') {
        return await handleMcpCall(req, res);
      }
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

// ─── GET /api/jobs and GET /api/jobs/:id ─────────────────────────────────────

async function handleGetJobs(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;

  // Specific job: /jobs/:id
  const match = path.match(/^\/jobs\/(.+)$/);
  if (match) {
    const jobId = match[1];
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists || jobDoc.data().userId !== userId) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.status(200).json({ job: { id: jobDoc.id, ...jobDoc.data() } });
    return;
  }

  // List jobs with optional status filter
  const status = req.query.status;
  const pageSize = parseInt(req.query.limit) || 50;
  let q = db.collection('jobs').where('userId', '==', userId);
  if (status) q = q.where('status', '==', status);
  q = q.orderBy('createdAt', 'desc').limit(pageSize);

  const snap = await q.get();
  const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.status(200).json({ jobs });
}

// ─── GET /api/sessions and GET /api/sessions/:id ─────────────────────────────

async function handleGetSessions(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;

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

  let q = db.collection('generations').where('userId', '==', userId).where('deletedAt', '==', null);
  if (server) q = q.where('serverId', '==', server);
  if (tool) q = q.where('toolId', '==', tool);
  q = q.orderBy('createdAt', 'desc').limit(pageSize);

  const snap = await q.get();
  const generations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.status(200).json({ generations });
}

// ─── DELETE /api/generations/:id — Soft delete (compliance) ──────────────────

async function handleSoftDeleteGeneration(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;
  const match = path.match(/^\/generations\/(.+)$/);
  if (!match) { res.status(400).json({ error: 'Generation ID required' }); return; }

  const genId = match[1];
  const genRef = db.collection('generations').doc(genId);
  const genDoc = await genRef.get();
  if (!genDoc.exists || genDoc.data().userId !== userId) {
    res.status(404).json({ error: 'Generation not found' });
    return;
  }
  // Soft delete only — never remove from GCS
  await genRef.update({ deletedAt: FieldValue.serverTimestamp() });
  res.status(200).json({ success: true, message: 'Generation soft-deleted' });
}

// ─── GET /api/media/:generationId — Serve media from GCS ────────────────────

async function handleGetMedia(req, res, path) {
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;
  const match = path.match(/^\/media\/(.+)$/);
  if (!match) { res.status(400).json({ error: 'Generation ID required' }); return; }

  const genId = match[1];
  const genDoc = await db.collection('generations').doc(genId).get();
  if (!genDoc.exists || genDoc.data().userId !== userId) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  const gen = genDoc.data();
  if (!gen.mediaUrl) {
    res.status(404).json({ error: 'No media file for this generation' });
    return;
  }

  // Generate a signed URL for download (valid 1 hour)
  const gcsPath = gen.mediaUrl.replace('gs://casey-genmedia-output/', '');
  const file = mediaBucket.file(gcsPath);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  });

  res.status(200).json({ url: signedUrl, mediaType: gen.mediaType, mediaSizeBytes: gen.mediaSizeBytes });
}

// ─── POST /api/mcp — Tool call with sync/async mode ─────────────────────────

async function handleMcpCall(req, res) {
  const startTime = Date.now();
  const decodedToken = await verifyAuthToken(req);
  const userId = decodedToken.uid;

  // Ensure user doc exists (server-side backup for client failures)
  const userRef = db.collection('users').doc(userId);
  await userRef.set({
    email: decodedToken.email || '',
    displayName: decodedToken.name || '',
    photoURL: decodedToken.picture || '',
    lastActive: FieldValue.serverTimestamp(),
  }, { merge: true });

  let { server, tool, params = {}, sessionId: clientSessionId, mcpSessionId: clientMcpSessionId, mode } = req.body;
  if (!server || !tool) {
    const pathParts = req.path.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      server = pathParts[pathParts.length - 2];
      tool = pathParts[pathParts.length - 1];
      params = req.body;
    }
  }

  const resolvedServer = SERVER_ALIASES[server] || server;

  if (!resolvedServer || typeof resolvedServer !== 'string') {
    res.status(400).json({ error: 'Missing required field: "server"', availableServers: [...Object.keys(MCP_SERVERS), ...Object.keys(LOCAL_ONLY_SERVERS)] });
    return;
  }
  if (!tool || typeof tool !== 'string') {
    res.status(400).json({ error: 'Missing required field: "tool"' });
    return;
  }
  if (LOCAL_ONLY_SERVERS[resolvedServer]) {
    res.status(400).json({ error: LOCAL_ONLY_SERVERS[resolvedServer], server: resolvedServer });
    return;
  }
  const serverConfig = MCP_SERVERS[resolvedServer];
  if (!serverConfig) {
    res.status(400).json({ error: `Unknown server: "${resolvedServer}"`, availableServers: Object.keys(MCP_SERVERS) });
    return;
  }

  const cleanParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) cleanParams[k] = v;
  }

  // Determine mode: explicit > server default
  const effectiveMode = mode || (ASYNC_DEFAULT_SERVERS.has(resolvedServer) ? 'async' : 'sync');

  // ─── ASYNC MODE: Queue and return immediately ───
  if (effectiveMode === 'async') {
    const jobRef = await db.collection('jobs').add({
      userId,
      serverId: server, // Keep original server ID for frontend
      toolId: tool,
      params: cleanParams,
      status: 'queued',
      result: null,
      error: null,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
      sessionId: clientSessionId || null,
    });

    res.status(202).json({
      success: true,
      jobId: jobRef.id,
      status: 'queued',
      mode: 'async',
    });
    return;
  }

  // ─── SYNC MODE: Process immediately (existing behavior) ───
  const promptText = cleanParams.description || cleanParams.prompt || cleanParams.response || Object.values(cleanParams)[0] || '';

  let firestoreSessionId = clientSessionId || null;
  let existingMcpSessionId = clientMcpSessionId || null;

  if (firestoreSessionId && !existingMcpSessionId) {
    const sessionDoc = await db.collection('sessions').doc(firestoreSessionId).get();
    if (sessionDoc.exists && sessionDoc.data().userId === userId) {
      existingMcpSessionId = sessionDoc.data().mcpSessionId || null;
    }
  }

  console.log(`[mcpProxy] uid=${userId} server=${resolvedServer} tool=${tool} mode=sync`);

  // Check cache
  const cachedResult = await getCachedResult(resolvedServer, tool, cleanParams);
  if (cachedResult) {
    const duration = Date.now() - startTime;
    await logRequest({ userId, userEmail: decodedToken.email, userName: decodedToken.name, serverId: resolvedServer, toolId: tool, params: cleanParams, result: cachedResult, status: 'success', duration, sessionId: firestoreSessionId });
    res.status(200).json({ success: true, server: resolvedServer, tool, result: cachedResult, cached: true, sessionId: firestoreSessionId, mode: 'sync', meta: { duration, timestamp: new Date().toISOString() } });
    return;
  }

  let mcpResult, mcpSessionId;
  try {
    const response = await forwardToCloudRun(serverConfig.url, tool, cleanParams, existingMcpSessionId);
    mcpResult = response.result;
    mcpSessionId = response.sessionId;
  } catch (err) {
    const duration = Date.now() - startTime;
    await logRequest({ userId, userEmail: decodedToken.email, userName: decodedToken.name, serverId: resolvedServer, toolId: tool, params: cleanParams, result: null, status: 'error', errorMessage: err.message, duration, sessionId: firestoreSessionId });
    throw err;
  }
  const result = mcpResult;
  const sessionId = mcpSessionId;
  const duration = Date.now() - startTime;

  // Cache the result
  await setCachedResult(resolvedServer, tool, cleanParams, result).catch(() => {});

  // Log request
  await logRequest({ userId, userEmail: decodedToken.email, userName: decodedToken.name, serverId: resolvedServer, toolId: tool, params: cleanParams, result, status: 'success', duration, sessionId: firestoreSessionId });

  if (!firestoreSessionId) {
    const sessionRef = await db.collection('sessions').add({
      userId, serverId: resolvedServer, toolId: tool, mcpSessionId: mcpSessionId || null,
      title: generateTitle(promptText), status: 'active', deleted: false,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastMessage: promptText.slice(0, 100),
    });
    firestoreSessionId = sessionRef.id;
    console.log(`[mcpProxy] Session created: ${firestoreSessionId} for user ${userId}`);
  } else {
    await db.collection('sessions').doc(firestoreSessionId).update({
      mcpSessionId: mcpSessionId || FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), lastMessage: promptText.slice(0, 100),
    });
  }

  await db.collection('sessions').doc(firestoreSessionId).collection('messages').add({
    role: 'user', content: promptText, timestamp: FieldValue.serverTimestamp(), metadata: {},
  });

  const content = result?.content || [];
  const textContent = content.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
  await db.collection('sessions').doc(firestoreSessionId).collection('messages').add({
    role: 'agent', content: textContent, contentBlocks: content, timestamp: FieldValue.serverTimestamp(), metadata: { duration, model: resolvedServer },
  });

  const mediaType = detectMediaType(result);
  const genRef = db.collection('generations').doc();
  let mediaInfo = { mediaUrl: null, mediaType: mediaType, mediaSizeBytes: null };
  try {
    const uploaded = await uploadMediaToGCS(result, userId, genRef.id);
    if (uploaded) mediaInfo = uploaded;
  } catch (uploadErr) {
    console.error(`[mcpProxy] GCS upload failed:`, uploadErr.message);
  }

  await genRef.set({
    userId, serverId: resolvedServer, toolId: tool, prompt: promptText, result,
    mediaUrl: mediaInfo.mediaUrl, mediaType: mediaInfo.mediaType, mediaSizeBytes: mediaInfo.mediaSizeBytes,
    createdAt: FieldValue.serverTimestamp(), deletedAt: null, sessionId: firestoreSessionId, status: 'completed', duration,
  });

  res.status(200).json({
    success: true, server: resolvedServer, tool, result, sessionId: firestoreSessionId,
    mcpSessionId: mcpSessionId || null, mode: 'sync',
    meta: { duration, timestamp: new Date().toISOString() },
  });
}

// ─── Admin Routes ────────────────────────────────────────────────────────────

async function handleAdminRoutes(req, res, path) {
  const decodedToken = await verifyAdmin(req);

  // GET /admin/users
  if (path === '/admin/users' && req.method === 'GET') {
    const usersSnap = await db.collection('users').get();
    const users = [];
    for (const doc of usersSnap.docs) {
      const u = doc.data();
      const genSnap = await db.collection('generations').where('userId', '==', doc.id).count().get();
      const sessSnap = await db.collection('sessions').where('userId', '==', doc.id).count().get();
      users.push({ id: doc.id, email: u.email, displayName: u.displayName, lastLogin: u.lastLogin, totalGenerations: genSnap.data().count, totalSessions: sessSnap.data().count });
    }
    return res.status(200).json({ users });
  }

  // GET /admin/users/:userId
  const userMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (userMatch && req.method === 'GET') {
    const uid = userMatch[1];
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const sessions = (await db.collection('sessions').where('userId', '==', uid).orderBy('updatedAt', 'desc').limit(50).get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const generations = (await db.collection('generations').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(50).get()).docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ user: { id: uid, ...userDoc.data() }, sessions, generations });
  }

  // GET /admin/requests
  if (path === '/admin/requests' && req.method === 'GET') {
    const pageSize = parseInt(req.query.limit) || 50;
    const snap = await db.collection('requests').orderBy('timestamp', 'desc').limit(pageSize).get();
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ requests });
  }

  // GET /admin/requests/:id
  const reqMatch = path.match(/^\/admin\/requests\/([^/]+)$/);
  if (reqMatch && req.method === 'GET') {
    const doc = await db.collection('requests').doc(reqMatch[1]).get();
    if (!doc.exists) return res.status(404).json({ error: 'Request not found' });
    return res.status(200).json({ request: { id: doc.id, ...doc.data() } });
  }

  // GET /admin/generations
  if (path === '/admin/generations' && req.method === 'GET') {
    const pageSize = parseInt(req.query.limit) || 50;
    const snap = await db.collection('generations').orderBy('createdAt', 'desc').limit(pageSize).get();
    const generations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ generations });
  }

  // GET /admin/cloud-logs
  if (path === '/admin/cloud-logs' && req.method === 'GET') {
    const pageSize = parseInt(req.query.limit) || 100;
    const service = req.query.service || '';
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 3600000).toISOString();

    const MCP_SERVICES = ['gstack-mcp', 'mcp-veo', 'mcp-nanobanana', 'mcp-lyria', 'mcp-avtool'];
    const serviceFilter = service
      ? `resource.labels.service_name="${service}"`
      : `resource.labels.service_name=(${MCP_SERVICES.map(s => `"${s}"`).join(' OR ')})`;

    const filter = `resource.type="cloud_run_revision" AND ${serviceFilter} AND httpRequest.requestUrl!="" AND timestamp>="${since}"`;

    const [entries] = await logging.getEntries({
      filter,
      orderBy: 'timestamp desc',
      pageSize,
    });

    const logs = (entries || []).map(entry => {
      const hr = entry.metadata?.httpRequest || entry.data?.httpRequest || {};
      const labels = entry.metadata?.resource?.labels || {};
      const userAgent = hr.userAgent || '';
      let source = 'Direct API';
      if (userAgent.includes('genmedia-hub') || hr.referer?.includes('genmedia')) source = 'Web App';
      else if (userAgent.includes('claude') || userAgent.includes('Claude')) source = 'Claude';
      else if (userAgent.includes('kiro') || userAgent.includes('Kiro')) source = 'Kiro';
      else if (userAgent.includes('antigravity') || userAgent.includes('Antigravity')) source = 'Antigravity';

      return {
        timestamp: entry.metadata?.timestamp || entry.data?.timestamp || null,
        service: labels.service_name || '',
        method: hr.requestMethod || '',
        path: hr.requestUrl || '',
        status: hr.status || 0,
        latency: hr.latency || null,
        callerIp: hr.remoteIp || '',
        userAgent,
        source,
        responseSize: hr.responseSize || 0,
      };
    });

    return res.status(200).json({ logs, count: logs.length });
  }

  // GET /admin/stats
  if (path === '/admin/stats' && req.method === 'GET') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

    const [totalUsersSnap, allReqSnap, todayReqSnap, weekReqSnap, monthReqSnap, cacheSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('requests').count().get(),
      db.collection('requests').where('timestamp', '>=', todayStart).count().get(),
      db.collection('requests').where('timestamp', '>=', weekStart).count().get(),
      db.collection('requests').where('timestamp', '>=', monthStart).count().get(),
      db.collection('cache').get(),
    ]);

    const errSnap = await db.collection('requests').where('status', '==', 'error').count().get();
    const totalReqs = allReqSnap.data().count;
    const errorCount = errSnap.data().count;
    const totalCacheHits = cacheSnap.docs.reduce((sum, d) => sum + (d.data().hitCount || 0), 0);

    // requests by server (sample last 200)
    const recentSnap = await db.collection('requests').orderBy('timestamp', 'desc').limit(200).get();
    const byServer = {};
    const byUser = {};
    let totalDuration = 0;
    recentSnap.docs.forEach(d => {
      const data = d.data();
      byServer[data.serverId] = (byServer[data.serverId] || 0) + 1;
      byUser[data.userEmail] = (byUser[data.userEmail] || 0) + 1;
      totalDuration += data.duration || 0;
    });

    return res.status(200).json({
      totalUsers: totalUsersSnap.data().count,
      totalRequests: totalReqs,
      requestsToday: todayReqSnap.data().count,
      requestsWeek: weekReqSnap.data().count,
      requestsMonth: monthReqSnap.data().count,
      errorRate: totalReqs > 0 ? (errorCount / totalReqs * 100).toFixed(1) : 0,
      avgResponseTime: recentSnap.size > 0 ? Math.round(totalDuration / recentSnap.size) : 0,
      cacheHits: totalCacheHits,
      cacheEntries: cacheSnap.size,
      byServer,
      byUser,
    });
  }

  return res.status(404).json({ error: 'Admin route not found' });
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
