// ─── KnightClaw CLI: Feature Re-Initializer ─────────────────────────────────
// After enable/disable, re-init the affected feature so runtime state
// matches the config on disk. This fixes the stale status bug.

import { getConfig, getStateDir } from "../config/index.js";
import { initGuard } from "../features/guard/index.js";
import { initLogs } from "../features/logs/index.js";
import { initVault } from "../features/vault/index.js";
import { initLockdown } from "../features/lockdown/index.js";
import type { FeatureName } from "../shared/types.js";

/**
 * Re-initialize a feature with the current config.
 * Called after enable/disable to sync runtime state.
 */
export function reinitFeature(feature: FeatureName): void {
  const config = getConfig();
  const stateDir = getStateDir();

  switch (feature) {
    case "guard":
      initGuard(config.guard, stateDir);
      break;

    case "logs":
      initLogs(config.logs, stateDir);
      break;
    case "vault":
      initVault(config.vault, stateDir);
      break;
    case "lockdown":
      initLockdown(config.lockdown, stateDir);
      break;
  }
}
