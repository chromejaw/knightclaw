// ─── KnightClaw Hook Integration: Session Gate ───────────────────────────────

import { log } from "../features/logs/index.js";

/** session_start handler */
export function onSessionStart(sessionKey?: string): void {
  log("logs", "info", "session_start", "Session started", {
    sessionKey: sessionKey ? "[present]" : "[none]",
  });
}

/** session_end handler */
export function onSessionEnd(sessionKey?: string): void {
  log("logs", "info", "session_end", "Session ended", {
    sessionKey: sessionKey ? "[present]" : "[none]",
  });
}
