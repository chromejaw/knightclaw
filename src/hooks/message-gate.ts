// ─── KnightClaw Hook Integration: Message Gate ───────────────────────────────
// Wires into message_received, message_sending, and message_sent hooks.

import { runGuard, runEgressGuard } from "../features/guard/index.js";
import { checkLockdown } from "../features/lockdown/index.js";
import { logSecurityEvent } from "../features/logs/index.js";

/**
 * message_received handler — Guard's ONE HOOK.
 * Runs the full Guard pipeline: CLEAN → DETECT → ADVANCED.
 *
 * Returns { cancel: true } to DROP the message before it reaches the agent,
 * or null to allow it through.
 */
export async function onMessageReceived(content: string, from: string): Promise<{ cancel: boolean; content?: string } | null> {
  // 0. Lockdown — block ALL inbound during emergency lockdown
  const lockdownResult = checkLockdown();
  if (!lockdownResult.allowed) {
    logSecurityEvent("lockdown", "critical", "block", `Inbound message blocked by lockdown from ${from}`, { sender: from });
    return { cancel: true };
  }

  // 1. Guard: sanitize and scan inbound message
  const result = await runGuard(content);

  if (result.blocked) {
    logSecurityEvent("guard", "error", "block", `Inbound message BLOCKED from ${from}`, { reason: result.reason, sender: from, contentLength: content.length });
    return { cancel: true };
  }

  // 2. Allowed — pass through sanitized content (Unicode-normalized, invisible chars stripped, etc.)
  logSecurityEvent("message-gate", "info", "allow", "Message received", { sender: from, length: content.length });
  // If the guard modified the text (normalization, stripping, etc.), return the sanitized version.
  if (result.sanitized !== content) {
    return { cancel: false, content: result.sanitized };
  }
  return null;
}

/**
 * message_sending handler — only lockdown check.
 * Returns { cancel: true } to block, or null to allow.
 */
export function onMessageSending(
  content: string,
  to: string,
): { content?: string; cancel?: boolean } | null {
  // 1. Lockdown Check
  const lockdownResult = checkLockdown();
  if (!lockdownResult.allowed) {
    logSecurityEvent("lockdown", "critical", "block", "Outbound message blocked by lockdown", { recipient: to });
    return { cancel: true };
  }

  // 2. Egress Guard (Redact/Block)
  const egressResult = runEgressGuard(content);

  if (egressResult.blocked) {
    logSecurityEvent("guard", "error", "block", "Outbound message blocked by Egress Guard", { recipient: to, reason: egressResult.reason });
    return { cancel: true };
  }

  if (egressResult.redacted) {
    logSecurityEvent("guard", "warn", "redact", "Outbound message redacted", { recipient: to, originalLength: content.length });
    return { content: egressResult.output };
  }

  return null;
}

/** message_sent handler — logs success */
export function onMessageSent(_content: string, to: string): void {
  logSecurityEvent("message-gate", "info", "allow", "Message sent", { recipient: to });
}
