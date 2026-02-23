// ─── KnightClaw Hook Integration: Tool Gate ──────────────────────────────────
// Wires tool execution into lockdown checks, guard scans, and audit logs.

import { checkLockdown } from "../features/lockdown/index.js";
import { runGuard } from "../features/guard/index.js";
import { logSecurityEvent } from "../features/logs/index.js";

/**
 * Before tool call handler — checks lockdown AND scans params with Guard.
 * Returns null if allowed, or { block: true, blockReason } to block.
 */
export async function beforeToolCall(
  toolName: string,
  params: Record<string, unknown>,
): Promise<{ block: boolean; blockReason?: string } | null> {
  // 1. Lockdown check (kill switch)
  const lockdownResult = checkLockdown();
  if (!lockdownResult.allowed) {
    logSecurityEvent("lockdown", "critical", "block", `Tool execution blocked by lockdown: ${toolName}`, { tool: toolName });
    return { block: true, blockReason: lockdownResult.reason };
  }

  // 2. Guard check (scan parameters for injection/malware)
  // We stringify params to check the entire payload
  const paramString = JSON.stringify(params);
  const guardResult = await runGuard(paramString);

  if (guardResult.blocked) {
    logSecurityEvent("guard", "error", "block", `Guard blocked tool '${toolName}'`, { tool: toolName, reason: guardResult.reason });
    return { block: true, blockReason: `Guard blocked tool '${toolName}': ${guardResult.reason}` };
  }

  // If allowed, we log the attempt (INFO level)
  // We do NOT log the full params here to avoid spam, unless high security mode is on.
  // For now, just the tool name.
  // actually, let's log it all, redacted.
  logSecurityEvent("tool", "info", "access", `Tool execution started: ${toolName}`, { tool: toolName, params });

  return null;
}

/** After tool call handler — logs completion */
export function afterToolCall(
  toolName: string,
  _result: unknown,
  durationMs?: number,
): void {
  logSecurityEvent("tool", "info", "allow", `Tool execution completed: ${toolName}`, { tool: toolName, durationMs });
}
