// ─── KnightClaw CLI: Status Command ──────────────────────────────────────────
// `openclaw knight status` — show the security dashboard
//
// Reads directly from the live config (getConfig) so status
// always reflects the current state, even after enable/disable.

import { getConfig } from "../config/index.js";
import { getGuardStatus } from "../features/guard/index.js";
import { getLockdownStatus } from "../features/lockdown/index.js";
import { formatDashboard } from "../shared/format.js";
import type { FeatureStatus, FeatureName } from "../shared/types.js";

/** Metadata for stubbed features only (guard & lockdown provide their own via getStatus) */
const FEATURE_META: Record<"logs" | "vault", { label: string; icon: string; layer: number | null }> = {
  logs: { label: "Logs", icon: "📋", layer: 2 },
  vault: { label: "Vault", icon: "🔐", layer: null },
};

/** Feature names in display order */
const FEATURE_ORDER: FeatureName[] = [
  "guard",
  "logs", "vault", "lockdown",
];

/**
 * Get live status for all features.
 *
 * For features with real implementations (Guard, Lockdown), we call
 * their getStatus() which returns runtime stats (blocked/allowed counts).
 *
 * For stubbed features (Logs, Vault), we read enabled state from config.
 */
export function getAllStatus(): FeatureStatus[] {
  const config = getConfig();
  const statuses: FeatureStatus[] = [];

  for (const name of FEATURE_ORDER) {
    try {
      // Use real getStatus for features that have runtime stats
      if (name === "guard") {
        statuses.push(getGuardStatus());
        continue;
      }
      if (name === "lockdown") {
        statuses.push(getLockdownStatus());
        continue;
      }

      // Stubbed features: read enabled state from live config
      const meta = FEATURE_META[name as "logs" | "vault"];
      const featureConfig = config[name] as Record<string, unknown> | undefined;
      const enabled = (featureConfig?.enabled as boolean) ?? false;

      statuses.push({
        name,
        label: meta.label,
        icon: meta.icon,
        layer: meta.layer,
        enabled,
        blocked: 0,
        allowed: 0,
      });
    } catch {
      // If a feature fails to report status, show it as disabled
      statuses.push({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        icon: "❓",
        layer: null,
        enabled: false,
        blocked: 0,
        allowed: 0,
      });
    }
  }

  return statuses;
}

/** Render the security dashboard */
export function renderDashboard(): string {
  return formatDashboard(getAllStatus());
}
