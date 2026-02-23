// ─── KnightClaw Config Schema & Validation ───────────────────────────────────
// Validates user config against expected shapes. Extra fields are ignored.

import type { KnightClawConfig, FeatureName } from "../shared/types.js";

/** All valid feature names */
export const FEATURE_NAMES: FeatureName[] = [
  "guard",
  "logs",
  "vault",
  "lockdown",
];

/** CLI-friendly aliases → actual feature names */
export const FEATURE_ALIASES: Record<string, FeatureName> = {
  guard: "guard",
  logs: "logs",
  log: "logs",
  vault: "vault",
  lockdown: "lockdown",
  lock: "lockdown",
};

/** Resolve a CLI feature input to a valid FeatureName */
export function resolveFeatureName(input: string): FeatureName | null {
  const normalized = input.trim().toLowerCase();
  return FEATURE_ALIASES[normalized] ?? null;
}

/** Validate that a config object has the right shape */
export function validateConfig(config: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    return { ok: false, errors: ["Config must be an object"] };
  }

  const cfg = config as Record<string, unknown>;

  if (cfg.version !== undefined && typeof cfg.version !== "number") {
    errors.push("version must be a number");
  }

  for (const name of FEATURE_NAMES) {
    const section = cfg[name];
    if (section === undefined) continue;

    if (typeof section !== "object" || section === null) {
      errors.push(`${name} must be an object`);
      continue;
    }

    const s = section as Record<string, unknown>;
    if (s.enabled !== undefined && typeof s.enabled !== "boolean") {
      errors.push(`${name}.enabled must be a boolean`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Check if a feature is enabled in a config */
export function isFeatureEnabled(config: KnightClawConfig, feature: FeatureName): boolean {
  const section = config[feature];
  if (!section || typeof section !== "object") return false;
  return "enabled" in section ? (section as { enabled: boolean }).enabled : false;
}
