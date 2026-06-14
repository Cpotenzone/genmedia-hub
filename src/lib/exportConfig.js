/**
 * MCP config export — generates the standard `mcpServers` JSON consumed by
 * Claude Desktop, Kiro, and Antigravity (Gemini). All three clients share the
 * same JSON shape; only the install path / instructions differ per target.
 */
import { mcpServers } from "./mcpServers";

export const GCLOUD_PROJECT = "casey-genmedia";
export const GCLOUD_LOCATION = "us-central1";
export const OUTPUT_BUCKET = "gs://casey-genmedia-output/";

/* Per-server launch command + environment. Key order is intentional — it is
   preserved verbatim in the exported JSON. */
export const serverLaunch = {
  "gstack-mcp": {
    command: "gstack-mcp",
    env: {
      TRANSPORT: "stdio",
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
    },
  },
  "genmedia-veo": {
    command: "mcp-veo-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
      OUTPUT_BUCKET,
    },
  },
  "genmedia-nanobanana": {
    command: "mcp-nanobanana-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
    },
  },
  "genmedia-lyria": {
    command: "mcp-lyria-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
      OUTPUT_BUCKET,
    },
  },
  "genmedia-chirp3": {
    command: "mcp-chirp3-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
    },
  },
  "genmedia-gemini": {
    command: "mcp-gemini-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
    },
  },
  "genmedia-avtool": {
    command: "mcp-avtool-go",
    env: {
      GOOGLE_CLOUD_PROJECT: GCLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: GCLOUD_LOCATION,
      OUTPUT_BUCKET,
    },
  },
};

/* Canonical server order (matches the dashboard / data file). */
export const SERVER_IDS = mcpServers.map((s) => s.id);

/* Export targets — same JSON, different destination + reload step. */
export const exportTargets = [
  {
    id: "claude",
    label: "Claude Desktop",
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
    filename: "claude_desktop_config.json",
    reload: "Fully quit and reopen Claude Desktop to load the new servers.",
  },
  {
    id: "kiro",
    label: "Kiro",
    path: "~/.kiro/settings/mcp.json",
    filename: "mcp.json",
    reload: "Open Kiro's MCP settings and reload the server list.",
  },
  {
    id: "gemini",
    label: "Antigravity (Gemini)",
    path: "~/.gemini/config/mcp_config.json",
    filename: "mcp_config.json",
    reload: "Restart Antigravity / the Gemini CLI to pick up the change.",
  },
];

export function getTarget(id) {
  return exportTargets.find((t) => t.id === id) || exportTargets[0];
}

/** Build the `{ mcpServers: { ... } }` object for the given server ids. */
export function buildConfig(ids) {
  const out = {};
  ids.forEach((id) => {
    const launch = serverLaunch[id];
    if (!launch) return;
    out[id] = { command: launch.command, args: [], env: { ...launch.env } };
  });
  return { mcpServers: out };
}

/** Pretty-printed JSON string for the given server ids. */
export function serializeConfig(ids) {
  return JSON.stringify(buildConfig(ids), null, 2);
}
