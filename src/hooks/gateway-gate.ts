// ─── KnightClaw Hook Integration: Gateway Gate ───────────────────────────────

import { log } from "../features/logs/index.js";

/** gateway_start handler */
export function onGatewayStart(): void {
  log("logs", "info", "gateway_start", "Gateway started — KnightClaw security active");
}

/** gateway_stop handler */
export function onGatewayStop(): void {
  log("logs", "info", "gateway_stop", "Gateway stopped — KnightClaw shutting down");
}
