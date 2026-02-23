// ─── KnightClaw CLI: Enable Command ──────────────────────────────────────────
// `openclaw knight enable <feature>` — turn on a feature

import { setFeatureEnabled } from "../config/index.js";
import { resolveFeatureName } from "../config/schema.js";
import { reinitFeature } from "./reinit.js";
import { success, error } from "../shared/format.js";
import { logSecurityEvent } from "../features/logs/index.js";

/** Enable a feature by name */
export function enableFeature(featureInput: string): string {
  const feature = resolveFeatureName(featureInput);

  if (!feature) {
    return error(`Unknown feature: "${featureInput}". Valid: guard, logs, vault, lockdown`);
  }

  // Lockdown uses its own command
  if (feature === "lockdown") {
    return error("Lockdown cannot be enabled here. Use: openclaw knight lockdown on");
  }

  // Update config on disk + in memory
  setFeatureEnabled(feature, true);

  // Re-init the feature with the updated config so status reflects immediately
  reinitFeature(feature);

  // Log the event
  logSecurityEvent("config", "info", "config", `Feature enabled: ${feature}`, { feature, actor: "user-cli" });

  return feature === "vault"
    ? success(`Vault is being forged`)
    : success(`${feature} is now enabled`);
}
