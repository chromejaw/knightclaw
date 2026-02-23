// ─── KnightClaw Config Loader ────────────────────────────────────────────────
// Loads config from disk, merges with secure defaults, validates.
// Config path: <stateDir>/knight.config.json

import fs from "node:fs";
import path from "node:path";
import type { KnightClawConfig, FeatureName } from "../shared/types.js";
import { DEFAULTS } from "./defaults.js";
import { validateConfig } from "./schema.js";

let _config: KnightClawConfig = structuredClone(DEFAULTS);
let _configPath: string | null = null;
let _stateDir: string | null = null;

/** Initialize config system with a state directory */
export function initConfig(stateDir: string): KnightClawConfig {
  _stateDir = stateDir;
  _configPath = path.join(stateDir, "knight.config.json");

  // Ensure state directory exists
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  }

  // Load user config if exists, otherwise use defaults
  if (fs.existsSync(_configPath)) {
    try {
      const raw = fs.readFileSync(_configPath, "utf8");
      const parsed = JSON.parse(raw);
      const validation = validateConfig(parsed);

      if (validation.ok) {
        _config = deepMerge(structuredClone(DEFAULTS), parsed);
      } else {
        // Bad config → fall back to secure defaults (fail closed)
        _config = structuredClone(DEFAULTS);
      }
    } catch {
      // Parse error → secure defaults (fail closed)
      _config = structuredClone(DEFAULTS);
    }
  } else {
    // No config file → create one with secure defaults
    _config = structuredClone(DEFAULTS);
    saveConfig();
  }

  return _config;
}

/** Get current config (read-only snapshot) */
export function getConfig(): Readonly<KnightClawConfig> {
  return _config;
}

/** Get the state directory */
export function getStateDir(): string {
  return _stateDir ?? "";
}

/** Enable or disable a feature */
export function setFeatureEnabled(feature: FeatureName, enabled: boolean): void {
  const section = _config[feature] as Record<string, unknown>;
  if (section && typeof section === "object") {
    section.enabled = enabled;
    saveConfig();
  }
}

/** Update a specific feature's config */
export function updateFeatureConfig(
  feature: FeatureName,
  updates: Record<string, unknown>,
): void {
  const section = _config[feature] as Record<string, unknown>;
  if (section && typeof section === "object") {
    Object.assign(section, updates);
    saveConfig();
  }
}

/** Save current config to disk */
function saveConfig(): void {
  if (!_configPath) return;
  const dir = path.dirname(_configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(_configPath, JSON.stringify(_config, null, 2), {
    encoding: "utf8",
    mode: 0o600, // owner read/write only
  });
}

/** Deep merge source into target (source overrides target; target retains keys missing from source) */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): KnightClawConfig {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) &&
      tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)
    ) {
      target[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      target[key] = srcVal;
    }
  }

  // Special handling for 'logs' to ensure default values for rotationSizeMb and retentionDays
  // if they are not explicitly provided in the source config.
  // This ensures the merged config always has these properties with sensible defaults.
  if (target.logs && typeof target.logs === 'object' && !Array.isArray(target.logs)) {
    const logsConfig = target.logs as Record<string, unknown>;
    if (typeof logsConfig.rotationSizeMb !== 'number') {
      logsConfig.rotationSizeMb = 50;
    }
    if (typeof logsConfig.retentionDays !== 'number') {
      logsConfig.retentionDays = 30;
    }
  }

  return target as unknown as KnightClawConfig;
}
