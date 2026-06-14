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

// Initialize Firebase Admin SDK
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);

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

// ─── Helper: Verify Authorization Header ─────────────────────────────────────

/**
 * Extract and verify the Firebase ID token from the Authorization header.
 * 
 * @param {object} req - The HTTP request object
 * @returns {Promise<object>} Decoded token with user info
 * @throws {Error} If token is missing or invalid
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
 * 
 * @param {string} serverUrl - Base URL of the Cloud Run service
 * @param {string} tool - Tool name to invoke
 * @param {object} params - Parameters for the tool
 * @returns {Promise<object>} The response from the MCP server
 */
async function forwardToCloudRun(serverUrl, tool, params) {
  // MCP servers expect JSON-RPC style requests
  const mcpRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: tool,
      arguments: params,
    },
    id: Date.now().toString(),
  };

  const response = await fetch(`${serverUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(mcpRequest),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    const error = new Error(`MCP server returned ${response.status}: ${errorText}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();

  // Handle JSON-RPC error responses
  if (data.error) {
    const error = new Error(data.error.message || 'MCP server error');
    error.statusCode = 500;
    error.mcpError = data.error;
    throw error;
  }

  return data.result || data;
}

// ─── Helper: Log Generation to Firestore ─────────────────────────────────────

/**
 * Log the MCP tool call to Firestore for usage tracking.
 */
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
    // Non-critical: don't fail the request if logging fails
    console.warn('Failed to log generation:', err.message);
  }
}

// ─── Main Cloud Function: MCP Proxy ─────────────────────────────────────────

/**
 * Authenticated proxy to Cloud Run MCP endpoints.
 * 
 * Request body:
 *   {
 *     "server": "mcp-veo",       // Required: MCP server name
 *     "tool": "generate_video",   // Required: Tool name to invoke
 *     "params": { ... }           // Optional: Parameters for the tool
 *   }
 * 
 * Response:
 *   200: { result: <tool_response> }
 *   400: { error: "..." } — Bad request (missing fields, unknown server)
 *   401: { error: "..." } — Authentication failed
 *   502: { error: "..." } — MCP server error
 *   500: { error: "..." } — Internal error
 */
export const mcpProxy = onRequest(
  {
    // Function configuration
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 50,
    cors: true, // Allow CORS for Firebase Hosting
  },
  async (req, res) => {
    // ── Only accept POST requests ──
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

      // ── Step 2: Validate Request Body ──
      const { server, tool, params = {} } = req.body;

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

      const result = await forwardToCloudRun(serverConfig.url, tool, params);
      const duration = Date.now() - startTime;

      // ── Step 6: Log Success ──
      await logGeneration(userId, server, tool, 'completed', duration);

      // ── Step 7: Return Result ──
      res.status(200).json({
        success: true,
        server,
        tool,
        result,
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.statusCode || 500;

      // Log failure if we have a user context
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

/**
 * Simple health check — returns available servers and status.
 * No authentication required (useful for monitoring).
 */
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
