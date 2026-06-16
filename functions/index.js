/**
 * GenMedia Hub — Firebase Cloud Functions
 * 
 * Authenticated proxy to Cloud Run MCP server endpoints.
 * Verifies Firebase ID tokens and routes requests to the appropriate
 * Cloud Run service based on server name.
 * 
 * Architecture:
 *   Client → Firebase Hosting → Cloud Function (auth check) → Cloud Run MCP
 * 
 * Security:
 *   - All requests require a valid Firebase ID token in the Authorization header
 *   - Tokens are verified server-side before any forwarding occurs
 *   - Cloud Run services are not publicly accessible without auth
 */
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

// Initialize Firebase Admin SDK
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuth = new GoogleAuth();

// ─── Server ID Aliases (frontend → backend normalization) ────────────────────
const SERVER_ALIASES = {
  'genmedia-veo': 'mcp-veo',
  'genmedia-nanobanana': 'mcp-nanobanana',
  'genmedia-lyria': 'mcp-lyria',
  'genmedia-chirp3': 'mcp-chirp3',
  'genmedia-gemini': 'mcp-gemini',
  'genmedia-avtool': 'mcp-avtool',
  'gstack-mcp': 'gstack-mcp',
};

// ─── Cloud Run MCP Server Registry ──────────────────────────────────────────
// Maps server names to their Cloud Run URLs
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

// Servers that are local-only and cannot be proxied via cloud
const LOCAL_ONLY_SERVERS = {
  'mcp-chirp3': 'chirp3 not available via cloud',
  'mcp-gemini': 'gemini not available via cloud',
};

// ─── Helper: Get Identity Token for Cloud Run ────────────────────────────────

async function getIdentityToken(targetUrl) {
  const client = await googleAuth.getIdTokenClient(targetUrl);
  const headers = await client.getRequestHeaders();
  return headers.Authorization;
}

// ─── Helper: Verify Authorization Header ─────────────────────────────────────

/**
 * Extract and verify the Firebase ID token from the Authorization header.
 */
async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Missing or malformed Authorization header. Expected: Bearer <token>');
    error.statusCode = 401;
    throw error;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    const error = new Error(`Invalid or expired authentication token: ${err.message}`);
    error.statusCode = 401;
    throw error;
  }
}

// ─── Helper: Forward Request to Cloud Run ────────────────────────────────────

/**
 * Forward an MCP tool call to the appropriate Cloud Run service.
 */
async function forwardToCloudRun(serverUrl, tool, params, existingSessionId = null) {
  const fullUrl = `${serverUrl}/mcp`;
  const authHeader = await getIdentityToken(fullUrl);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': authHeader,
  };

  let sessionId = existingSessionId;

  // Step 1: Initialize session only if we don't have one already
  if (!sessionId) {
    const initResponse = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'genmedia-hub', version: '1.0' },
        },
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

  // Step 2: Send tools/call with session ID
  const callHeaders = { ...headers };
  if (sessionId) callHeaders['Mcp-Session-Id'] = sessionId;

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: callHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: params },
    }),
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

// ─── Helper: Log Generation to Firestore ─────────────────────────────────────

async function logGeneration(userId, server, tool, status, duration) {
  try {
    await db.collection('generations').add({
      userId,
      server,
      tool,
      status,
      duration,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to log generation:', err.message);
  }
}

// ─── Main Cloud Function: MCP Proxy ─────────────────────────────────────────

export const mcpProxy = onRequest(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 120,
    maxInstances: 50,
    cors: true,
    invoker: 'public',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method not allowed. Use POST.',
        allowed: ['POST'],
      });
      return;
    }

    const startTime = Date.now();
    let userId = null;

    try {
      // ── Step 1: Verify Authentication ──
      const decodedToken = await verifyAuthToken(req);
      userId = decodedToken.uid;

      // ── Step 2: Extract server, tool, params, sessionId ──
      // Support both formats:
      // Format A: POST /api/mcp with body {server, tool, params, sessionId}
      // Format B: POST /api/mcp/{server}/{tool} with body as params
      let { server, tool, params = {}, sessionId: existingSessionId } = req.body;

      if (!server || !tool) {
        // Try to extract from URL path
        const pathParts = req.path.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          server = pathParts[pathParts.length - 2];
          tool = pathParts[pathParts.length - 1];
          params = req.body; // entire body is params
        }
      }

      // Normalize server IDs (frontend uses genmedia-X, backend uses mcp-X)
      server = SERVER_ALIASES[server] || server;

      if (!server || typeof server !== 'string') {
        res.status(400).json({
          error: 'Missing required field: "server" (string)',
          availableServers: [
            ...Object.keys(MCP_SERVERS),
            ...Object.keys(LOCAL_ONLY_SERVERS),
          ],
        });
        return;
      }

      if (!tool || typeof tool !== 'string') {
        res.status(400).json({
          error: 'Missing required field: "tool" (string)',
        });
        return;
      }

      // ── Step 3: Check for Local-Only Servers ──
      if (LOCAL_ONLY_SERVERS[server]) {
        res.status(400).json({
          error: LOCAL_ONLY_SERVERS[server],
          server,
          hint: 'This server is only available when running locally.',
        });
        return;
      }

      // ── Step 4: Resolve Server URL ──
      const serverConfig = MCP_SERVERS[server];
      if (!serverConfig) {
        res.status(400).json({
          error: `Unknown server: "${server}"`,
          availableServers: Object.keys(MCP_SERVERS),
          localOnlyServers: Object.keys(LOCAL_ONLY_SERVERS),
        });
        return;
      }

      // ── Step 5: Forward to Cloud Run ──
      console.log(`[mcpProxy] uid=${userId} server=${server} tool=${tool}`);

      // Filter out empty string values to avoid confusing MCP servers
      const cleanParams = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== "" && v !== null && v !== undefined) cleanParams[k] = v;
      }

      const { result, sessionId } = await forwardToCloudRun(serverConfig.url, tool, cleanParams, existingSessionId || null);
      const duration = Date.now() - startTime;

      // ── Step 6: Log Success ──
      await logGeneration(userId, server, tool, 'completed', duration);

      // ── Step 7: Return Result ──
      res.status(200).json({
        success: true,
        server,
        tool,
        result,
        sessionId: sessionId || null,
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.statusCode || 500;

      if (userId) {
        await logGeneration(userId, req.body?.server, req.body?.tool, 'failed', duration);
      }

      console.error(`[mcpProxy] Error (${statusCode}):`, error.message);

      res.status(statusCode).json({
        success: false,
        error: error.message,
        ...(error.mcpError ? { mcpError: error.mcpError } : {}),
      });
    }
  }
);

// ─── Health Check Endpoint ───────────────────────────────────────────────────

export const health = onRequest(
  {
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 10,
    maxInstances: 10,
  },
  async (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'genmedia-hub-functions',
      timestamp: new Date().toISOString(),
      servers: {
        cloud: Object.keys(MCP_SERVERS),
        localOnly: Object.keys(LOCAL_ONLY_SERVERS),
      },
    });
  }
);
