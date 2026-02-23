// ─── KnightClaw Hook Integration: Master Registrar ───────────────────────────
// Wires all gates into the OpenClaw plugin API.
// Priority 9999 = KnightClaw runs BEFORE all other plugins.

import { beforeToolCall, afterToolCall } from "./tool-gate.js";
import { onMessageReceived, onMessageSending, onMessageSent } from "./message-gate.js";
import { onBeforeAgentStart, onAgentEnd } from "./agent-gate.js";
import { onSessionStart, onSessionEnd } from "./session-gate.js";
import { onGatewayStart, onGatewayStop } from "./gateway-gate.js";

/** The plugin API type — matches OpenClawPluginApi */
type PluginApi = {
  on: (hookName: string, handler: (...args: unknown[]) => unknown, opts?: { priority?: number }) => void;
};

/** Register all KnightClaw hooks with the OpenClaw plugin API */
export function registerAllHooks(api: PluginApi): void {
  const PRIORITY = 9999; // Run before ALL other plugins

  // ── Tool Hooks (primary enforcement) ─────────────────────────────────
  api.on(
    "before_tool_call",
    (event: unknown) => {
      const e = event as { toolName: string; params: Record<string, unknown> };
      return beforeToolCall(e.toolName, e.params ?? {});
    },
    { priority: PRIORITY },
  );

  api.on(
    "after_tool_call",
    (event: unknown) => {
      const e = event as { toolName: string; result: unknown; durationMs?: number };
      afterToolCall(e.toolName, e.result, e.durationMs);
    },
    { priority: PRIORITY },
  );

  // ── Message Hooks ────────────────────────────────────────────────────
  api.on(
    "message_received",
    (event: unknown) => {
      const e = event as { content: string; from: string };
      return onMessageReceived(e.content, e.from);
    },
    { priority: PRIORITY },
  );

  api.on(
    "message_sending",
    (event: unknown) => {
      const e = event as { content: string; to: string };
      return onMessageSending(e.content, e.to);
    },
    { priority: PRIORITY },
  );

  api.on(
    "message_sent",
    (event: unknown) => {
      const e = event as { content: string; to: string };
      onMessageSent(e.content, e.to);
    },
    { priority: PRIORITY },
  );

  // ── Agent Hooks ──────────────────────────────────────────────────────
  api.on(
    "before_agent_start",
    (event: unknown) => {
      const e = event as { prompt: string };
      return onBeforeAgentStart(e.prompt);
    },
    { priority: PRIORITY },
  );

  api.on(
    "agent_end",
    (event: unknown) => {
      const e = event as { success: boolean; durationMs?: number; error?: string };
      onAgentEnd(e.success, e.durationMs, e.error);
    },
    { priority: PRIORITY },
  );

  // ── Session Hooks ────────────────────────────────────────────────────
  api.on(
    "session_start",
    (event: unknown, ctx: unknown) => {
      const c = ctx as { sessionKey?: string };
      onSessionStart(c?.sessionKey);
    },
    { priority: PRIORITY },
  );

  api.on(
    "session_end",
    (event: unknown, ctx: unknown) => {
      const c = ctx as { sessionKey?: string };
      onSessionEnd(c?.sessionKey);
    },
    { priority: PRIORITY },
  );

  // ── Gateway Hooks ────────────────────────────────────────────────────
  api.on(
    "gateway_start",
    () => {
      onGatewayStart();
    },
    { priority: PRIORITY },
  );

  api.on(
    "gateway_stop",
    () => {
      onGatewayStop();
    },
    { priority: PRIORITY },
  );
}
