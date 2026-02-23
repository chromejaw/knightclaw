// ─── KnightClaw CLI: Logs Command ────────────────────────────────────────────
// `openclaw knight logs` — merged audit + gateway timeline
// Merges KnightClaw audit entries with OpenClaw gateway entries by timestamp.

import { getLogReader } from '../features/logs/index.js';
import { LogEntry, GatewayLogEntry, DisplayEntry, isGatewayEntry } from '../features/logs/types.js';
import { GatewayLogReader } from '../features/logs/gateway-reader.js';
import { LogReader } from '../features/logs/reader.js';
import fs from 'node:fs';

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
};

const ICONS: Record<string, string> = {
  guard: "🛡️ ",
  lockdown: "🔒",
  tool: "🔧",
  config: "⚙️ ",
  system: "🖥️ ",
  agent: "🤖",
  message: "📡",
  "message-gate": "📡",
  // Gateway components
  gateway: "🌐",
  whatsapp: "📱",
  ws: "🔌",
  plugins: "🧩",
  reload: "🔄",
  "KnightClaw": "⚔️ ",
  default: "📝"
};

export async function handleLogsCommand(args: string[]): Promise<string> {
  const reader = getLogReader();
  if (!reader) {
    return `${c.red}Logs not initialized or disabled.${c.reset}`;
  }

  // Parse args manually since we receive a raw array
  const flags = new Set(args.filter(a => a.startsWith('-')));
  const params = args.filter(a => !a.startsWith('-'));
  const command = params[0] || "tail";

  if (command === "verify") {
    return await runVerify(reader);
  }

  if (command === "export") {
    return await runExport(reader);
  }

  // Tail / Watch — determine count from args
  // Supports: `logs`, `logs 50`, `logs tail`, `logs tail 50`
  let count = 20;
  for (const p of params) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n > 0) { count = n; break; }
  }

  const follow = flags.has('-f') || flags.has('--follow');
  const formatJson = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json';

  if (follow) {
    if (formatJson) {
      return `${c.red}JSON format not supported in follow mode.${c.reset}`;
    }
    return await runWatch(reader, count);
  }

  return await runTail(reader, count, formatJson);
}

async function runVerify(reader: LogReader): Promise<string> {
  const lines: string[] = [];
  lines.push(`${c.bold}Verifying Audit Chain Integrity...${c.reset}`);
  lines.push(`${c.dim}--------------------------------${c.reset}`);

  const result = await reader.verifyChain();

  if (result.valid) {
    lines.push(`${c.green}✅ CHAIN VALID${c.reset}`);
    lines.push(`Verified ${result.total} sequential entries.`);
    lines.push(`No tampering detected.`);
  } else {
    lines.push(`${c.red}❌ TAMPERING DETECTED${c.reset}`);
    lines.push(`Found ${result.errors.length} integrity violations:`);
    result.errors.forEach((e: string) => lines.push(`  - ${e}`));
  }

  return lines.join('\n');
}

async function runExport(reader: LogReader): Promise<string> {
  const entries = await reader.exportLogs();
  const filename = `knightclaw-audit-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      integrity: "CHAIN_VERIFIED_ON_EXPORT"
    },
    entries
  };

  try {
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  } catch (err: any) {
    return `${c.red}❌ Failed to write export file: ${err.message}${c.reset}`;
  }
  return `${c.green}✅ Logs exported to ${c.bold}${filename}${c.reset} (${entries.length} entries)`;
}

// ─── Merged Tail ─────────────────────────────────────────────────────────────

async function runTail(reader: LogReader, count: number, json = false): Promise<string> {
  // 1. Get KnightClaw audit entries
  const auditEntries = await reader.tail(count);

  // 2. Get gateway entries (non-fatal — if gateway logs are missing, just show audit)
  let gatewayEntries: GatewayLogEntry[] = [];
  try {
    const gwReader = new GatewayLogReader();
    if (gwReader.hasLogs()) {
      gatewayEntries = await gwReader.tail(count);
    }
  } catch {
    // Gateway logs unavailable — continue with audit-only
  }

  // 3. Merge by timestamp (two-pointer on pre-sorted arrays)
  const merged = mergeByTimestamp(auditEntries, gatewayEntries);

  // 4. Take last N from merged
  const display = merged.slice(-count);

  if (json) {
    return JSON.stringify(display, null, 2);
  }

  if (display.length === 0) {
    return `${c.dim}No logs found.${c.reset}`;
  }

  const output: string[] = [];

  // Count sources for header
  const auditCount = display.filter(e => !isGatewayEntry(e)).length;
  const gwCount = display.filter(e => isGatewayEntry(e)).length;
  const headerSuffix = display.length < count ? " (All available)" : "";
  const sourceInfo = gwCount > 0
    ? ` ${c.dim}(${auditCount} audit + ${gwCount} gateway)${c.reset}`
    : "";

  output.push(`${c.bold}Last ${display.length} Security Events${headerSuffix}:${c.reset}${sourceInfo}`);
  output.push("");

  for (const e of display) {
    output.push(formatEntry(e));
  }

  return output.join('\n');
}

// ─── Follow Mode (merged live stream) ────────────────────────────────────────

async function runWatch(reader: LogReader, count: number): Promise<string> {
  console.log(`${c.dim}Streaming logs from audit + gateway... (Press Ctrl+C to exit)${c.reset}`);

  // Print last N merged entries for context
  const auditEntries = await reader.tail(count);
  const gwReader = new GatewayLogReader();
  let gatewayEntries: GatewayLogEntry[] = [];
  if (gwReader.hasLogs()) {
    gatewayEntries = await gwReader.tail(count);
  }
  const initial = mergeByTimestamp(auditEntries, gatewayEntries).slice(-count);
  initial.forEach(e => console.log(formatEntry(e)));

  if (initial.length > 0) {
    console.log(`${c.dim}── live stream ──${c.reset}`);
  }

  // Start watching both sources — neither blocks, both set up intervals
  reader.watch((entry) => {
    console.log(formatEntry(entry));
  });

  if (gwReader.hasLogs()) {
    gwReader.watch((entry) => {
      console.log(formatEntry(entry));
    });
  }

  // Block forever
  return new Promise(() => { });
}

// ─── Two-Pointer Merge ───────────────────────────────────────────────────────

function mergeByTimestamp(
  auditEntries: LogEntry[],
  gatewayEntries: GatewayLogEntry[]
): DisplayEntry[] {
  const result: DisplayEntry[] = [];
  let i = 0;
  let j = 0;

  while (i < auditEntries.length && j < gatewayEntries.length) {
    if (auditEntries[i].timestamp <= gatewayEntries[j].timestamp) {
      result.push(auditEntries[i++]);
    } else {
      result.push(gatewayEntries[j++]);
    }
  }

  while (i < auditEntries.length) result.push(auditEntries[i++]);
  while (j < gatewayEntries.length) result.push(gatewayEntries[j++]);

  return result;
}

// ─── Entry Formatter ─────────────────────────────────────────────────────────

function formatEntry(e: DisplayEntry): string {
  if (isGatewayEntry(e)) {
    return formatGatewayEntry(e);
  }
  return formatAuditEntry(e);
}

function formatAuditEntry(e: LogEntry): string {
  let sevColor = c.reset;
  if (e.severity === 'error') sevColor = c.red;
  if (e.severity === 'warn') sevColor = c.yellow;
  if (e.severity === 'critical') sevColor = c.red + c.bold;

  const time = new Date(e.timestamp).toLocaleTimeString();
  const icon = ICONS[e.layer] || ICONS.default;
  const layer = e.layer.toUpperCase().padEnd(8);

  let line = `${c.dim}[${time}]${c.reset} ${icon} ${sevColor}${layer}${c.reset} ${e.message}`;

  if (e.metadata && Object.keys(e.metadata).length > 0) {
    const meta = JSON.stringify(e.metadata);
    // Use plain text length for layout decisions (exclude ANSI escapes)
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    if (plainLine.length + meta.length < 100) {
      line += ` ${c.dim}| ${meta}${c.reset}`;
    } else {
      line += `\n       ${c.dim}└─ ${meta}${c.reset}`;
    }
  }
  return line;
}

function formatGatewayEntry(e: GatewayLogEntry): string {
  let sevColor = c.reset;
  if (e.severity === 'error') sevColor = c.red;
  if (e.severity === 'warn') sevColor = c.yellow;
  if (e.severity === 'critical') sevColor = c.red + c.bold;

  const time = new Date(e.timestamp).toLocaleTimeString();
  const icon = ICONS[e.component] || ICONS.gateway;
  const comp = e.component.toUpperCase().padEnd(8);

  // Tag gateway entries with [GW] so the user can distinguish sources
  return `${c.dim}[${time}]${c.reset} ${icon} ${sevColor}${comp}${c.reset} ${c.cyan}[GW]${c.reset} ${e.message}`;
}
