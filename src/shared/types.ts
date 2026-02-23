// ─── KnightClaw Shared Types ─────────────────────────────────────────────────
// Every type used across the plugin lives here. Single source of truth.

/** The 4 KnightClaw feature names */
export type FeatureName =
  | "guard"
  | "logs"
  | "vault"
  | "lockdown";

/** Feature status for the dashboard */
export type FeatureStatus = {
  name: FeatureName;
  enabled: boolean;
  label: string;
  icon: string;
  layer: number | null; // null for cross-cutting (vault)
  blocked: number; // count of items blocked since startup
  allowed: number; // count of items allowed since startup
};

/** A single audit log entry */
export type LogEntry = {
  id: string;
  timestamp: string;
  feature: FeatureName;
  action: "allowed" | "denied" | "error" | "info" | "alert";
  category: string;
  summary: string;
  details?: Record<string, unknown>;
  hash: string; // SHA-256 of previous hash + this entry
  previousHash: string;
};

/** Guard config */
export type GuardConfig = {
  enabled: boolean;
  maxInputLength: number;

  // Phase 1: CLEAN
  unicodeNormalize: boolean;
  invisibleStrip: boolean;
  controlStrip: boolean;
  newlineNormalize: boolean;
  homoglyphNormalize: boolean;

  // Guard 2.0 Layers
  patterns: {
    enabled: boolean;
    injection: boolean;
    templates: boolean;
    schemes: boolean;
  };
  egress: {
    enabled: boolean;
    redactSecrets: boolean;
  };

  // Phase 3: Advanced
  advanced: {
    enabled: boolean;
    homoglyphScore: boolean;
    homoglyphBlockThreshold: number;
    encodingDetect: boolean;
    multilingualScan: boolean;
    delimiterFence: boolean;
  };

  perplexity: { enabled: boolean; threshold: number };
  boundary: { enabled: boolean };
  entropy: { enabled: boolean };
  heuristics: { enabled: boolean; threshold: number };
  semantic: { enabled: boolean; threshold: number };
};





export interface LogsConfig {
  enabled: boolean;
  rotationSizeMb?: number;
  retentionDays?: number;
  secret?: string;
  // Deprecated/Legacy fields compatibility if needed, or just clean break
  // Keeping clean for the new feature
}
;



/** Vault config */
export type VaultConfig = {
  enabled: boolean;
  algorithm: string;
  keyDerivation: string;
  iterations: number;
};

/** Lockdown config */
export interface LockdownConfig {
  active: boolean;              // Master kill switch: true = block EVERYTHING
  autoTrigger: boolean;         // Should the Velocity Circuit Breaker be enabled?
  autoTriggerThreshold: number; // Number of failed blocks in a row to trip lockdown (e.g. 5)
  lockedAt?: string;            // ISO timestamp of when lockdown was activated (persisted)
  lockedBy?: string;            // Reason/source for the lockdown (persisted)
}
export type KnightClawConfig = {
  version: number;
  guard: GuardConfig;
  logs: LogsConfig;
  vault: VaultConfig;
  lockdown: LockdownConfig;
};

/** Result of a security check — either allow or block */
export type CheckResult = {
  allowed: boolean;
  reason?: string;
  feature: FeatureName;
  suggestion?: string; // user-friendly fix suggestion
};

/** A feature module interface — every feature implements this */
export type FeatureModule = {
  name: FeatureName;
  label: string;
  icon: string;
  layer: number | null;
  getStatus: () => FeatureStatus;
};
