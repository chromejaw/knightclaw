// ─── KnightClaw CLI: Disable Command ─────────────────────────────────────────
// `openclaw knight disable <feature>` — turn off a feature
// REQUIRES CONFIRMATION — disabling security should never be accidental.

import { setFeatureEnabled } from "../config/index.js";
import { resolveFeatureName } from "../config/schema.js";
import { reinitFeature } from "./reinit.js";
import { warn, error } from "../shared/format.js";
import { logSecurityEvent } from "../features/logs/index.js";

/** Disable a feature by name (requires explicit confirmation) */
export function disableFeature(featureInput: string, confirmed: boolean = false): string {
  const feature = resolveFeatureName(featureInput);

  if (!feature) {
    return error(`Unknown feature: "${featureInput}". Valid: guard, logs, vault, lockdown`);
  }

  // Lockdown uses its own command
  if (feature === "lockdown") {
    return error("Lockdown cannot be disabled here. Use: openclaw knight lockdown off");
  }

  // Require explicit confirmation
  if (!confirmed) {
    return warn(
      `⚠️  Disabling "${feature}" will reduce your security.\n` +
      `  To confirm: openclaw knight disable ${feature} --confirm\n` +
      `  This action will be logged.`,
    );
  }

  // Log BEFORE disabling — if we're disabling "logs" itself, the event
  // must be written while the logger is still active
  logSecurityEvent("config", "warn", "config", `Feature DISABLED: ${feature}`, { feature, actor: "user-cli" });

  // Update config on disk + in memory
  setFeatureEnabled(feature, false);

  // Re-init the feature with the updated config
  reinitFeature(feature);

  return feature === "vault"
    ? warn(`Vault encryption is now DISABLED. Run "openclaw knight enable ${feature}" to re-enable.`)
    : warn(`${feature} is now DISABLED. Run "openclaw knight enable ${feature}" to re-enable.`);
}
