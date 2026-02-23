// ─── KnightClaw Hook Integration: Agent Gate ─────────────────────────────────
// Logs agent lifecycle events. Guard checks happen in message-gate.ts.
//
// NOTE: Guard is NOT run here. The before_agent_start hook receives the FULL
// agent prompt from OpenClaw (system prompt + role markers + chat history),
// which inherently contains conversation delimiters (System:, Human:, <|im_start|>, etc.).
// Running the guard on this would flag OpenClaw's own formatting as attacks.
// The guard runs ONCE in message-gate.ts on the raw user message — that is
// the correct enforcement point.

import { logSecurityEvent } from "../features/logs/index.js";

/** before_agent_start handler — logs agent start */
export async function onBeforeAgentStart(
  prompt: string,
): Promise<{ systemPrompt?: string; prependContext?: string } | null> {
  logSecurityEvent("agent", "info", "allow", "Agent started", { promptLength: prompt?.length ?? 0 });
  return null;
}

/** agent_end handler — logs completion */
export function onAgentEnd(
  success: boolean,
  durationMs?: number,
  error?: string,
): void {
  const severity = success ? "info" : "error";
  const message = success ? "Agent finished successfully" : `Agent failed: ${error}`;
  logSecurityEvent("agent", severity, "system", message, { durationMs, error });
}
