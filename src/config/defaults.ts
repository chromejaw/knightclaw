// ─── KnightClaw Secure Defaults ──────────────────────────────────────────────
// DEFAULT STATE = MOST SECURE. Every feature on. Every gate closed.

import type { KnightClawConfig } from "../shared/types.js";

/** The most secure configuration — used when no user config exists */
export const DEFAULTS: KnightClawConfig = {
  version: 1,

  guard: {
    enabled: true,
    maxInputLength: 100_000,

    // Phase 1: CLEAN — all on
    unicodeNormalize: true,
    invisibleStrip: true,
    controlStrip: true,
    newlineNormalize: true,
    homoglyphNormalize: true, // Guard 3.0: Normalize Cyrillic/Greek to Latin

    // Guard 2.0 Layers — all on by default (SOTA security)
    patterns: {
      enabled: true,
      injection: true,
      templates: true,
      schemes: true,
    },
    egress: {
      enabled: true,
      redactSecrets: true,
    },
    // Phase 3: Advanced — SOTA logic
    advanced: {
      enabled: true,
      homoglyphScore: true,
      homoglyphBlockThreshold: 0.3, // >30% confusable chars = block
      encodingDetect: true,
      multilingualScan: true,
      delimiterFence: true,
    },

    perplexity: { enabled: true, threshold: 2000 },
    boundary: { enabled: true },
    entropy: { enabled: true },
    heuristics: { enabled: true, threshold: 100 },
    semantic: { enabled: true, threshold: 0.77 },
  },







  logs: {
    enabled: true,
    rotationSizeMb: 50,
    retentionDays: 30,
    // secret auto-generated if missing
  },



  vault: {
    enabled: true,
    algorithm: "aes-256-gcm",
    keyDerivation: "pbkdf2",
    iterations: 600_000,
  },

  lockdown: {
    active: false,
    autoTrigger: true,
    autoTriggerThreshold: 5,
  },
};
