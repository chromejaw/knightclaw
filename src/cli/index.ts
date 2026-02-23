// ─── KnightClaw CLI: Command Router ──────────────────────────────────────────
// Routes `openclaw knight <subcommand>` to the right handler.

import path from "node:path";
import { renderDashboard } from "./status.js";
import { enableFeature } from "./enable.js";
import { disableFeature } from "./disable.js";
import { handleLogsCommand } from "./logs.js";
import { handleUninstallCommand } from "./uninstall.js";
import { activateLockdown, deactivateLockdown, isLockdownActive, initLockdown } from "../features/lockdown/index.js";
import { initGuard } from "../features/guard/index.js";
import { updateFeatureConfig, initConfig } from "../config/index.js";
import { logSecurityEvent, initLogs } from "../features/logs/index.js";
import { banner, success, warn, error } from "../shared/format.js";

export type CommandResult = {
  output: string;
  exitCode: number;
};

/** Route a knight CLI command to the appropriate handler */
export async function handleCommand(args: string): Promise<CommandResult> {
  // Ensure config and ALL features are initialized for CLI context
  // Use same resolution logic as main plugin, but standalone
  const stateDir = process.env.KNIGHTCLAW_STATE_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || ".", ".openclaw", "knightclaw-state");

  const config = initConfig(stateDir);
  initLogs(config.logs, stateDir);
  initGuard(config.guard, stateDir);
  initLockdown(config.lockdown, stateDir);

  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() ?? "status";
  const rest = parts.slice(1);

  switch (subcommand) {
    case "status":
      return { output: renderDashboard(), exitCode: 0 };

    case "enable": {
      if (!rest[0]) return { output: error("Usage: openclaw knight enable <feature>"), exitCode: 1 };
      const out = enableFeature(rest[0]);
      return { output: out, exitCode: out.includes("❌") ? 1 : 0 };
    }

    case "disable": {
      if (!rest[0]) return { output: error("Usage: openclaw knight disable <feature> [--confirm]"), exitCode: 1 };
      const out = disableFeature(rest[0], rest.includes("--confirm") || rest.includes("-y"));
      return { output: out, exitCode: out.includes("❌") ? 1 : 0 };
    }

    case "logs":
      try {
        const output = await handleLogsCommand(rest);
        return { output, exitCode: 0 };
      } catch (e: any) {
        return { output: `Error reading logs: ${e.message}`, exitCode: 1 };
      }

    case "lockdown":
      return handleLockdown(rest);

    case "help":
      return { output: showHelp(), exitCode: 0 };

    case "uninstall":
      // Check for --confirm
      if (!rest.includes("--confirm") && !rest.includes("-y")) {
        return {
          output: error("⚠️  This will remove KnightClaw from your system.\n  Run with --confirm to proceed."),
          exitCode: 1
        };
      }
      return { output: handleUninstallCommand(rest), exitCode: 0 };

    case "version":
      return { output: banner(), exitCode: 0 };

    default:
      return {
        output: error(`Unknown command: "${subcommand}".\n${showHelp()}`),
        exitCode: 1,
      };
  }
}

/** Handle lockdown subcommand */
function handleLockdown(args: string[]): CommandResult {
  const action = args[0]?.toLowerCase();

  if (!action || action === "status") {
    const active = isLockdownActive();
    return {
      output: active
        ? warn("🚨 LOCKDOWN IS ACTIVE — all operations are blocked")
        : success("Lockdown is NOT active"),
      exitCode: 0,
    };
  }

  if (action === "on") {
    if (isLockdownActive()) {
      return { output: warn("🚨 Lockdown is already active"), exitCode: 0 };
    }
    activateLockdown("Admin (CLI)", false); // false = no auto-recover
    logSecurityEvent("lockdown", "critical", "config", "LOCKDOWN ACTIVATED via CLI", { actor: "user-cli" });
    return { output: warn("🚨 LOCKDOWN ACTIVATED — all operations are now blocked"), exitCode: 0 };
  }

  if (action === "off") {
    if (!args.includes("--confirm") && !args.includes("-y")) {
      return {
        output: warn("⚠️  Deactivating lockdown will allow all operations.\n  Confirm: openclaw knight lockdown off --confirm"),
        exitCode: 0,
      };
    }
    deactivateLockdown();
    logSecurityEvent("lockdown", "warn", "config", "Lockdown deactivated via CLI", { actor: "user-cli" });
    return { output: success("Lockdown deactivated — operations resumed"), exitCode: 0 };
  }

  return { output: error("Usage: openclaw knight lockdown [on|off|status]"), exitCode: 1 };
}

/** Show help text */
function showHelp(): string {
  return [
    banner(),
    "  Commands:",
    "    status              Show security dashboard",
    "    enable <feature>    Turn on a feature",
    "    disable <feature>   Turn off a feature (requires --confirm)",
    "    logs [N|verify|export]     Audit + gateway merged timeline",
    "    logs -f                     Follow mode (live stream)",
    "    lockdown [on|off]   Emergency kill switch",
    "    uninstall           Remove KnightClaw (requires --confirm)",
    "    help                Show this help",
    "    version             Show version",
    "",
    "  Features: guard, logs, vault, lockdown",
    "",
    "  Examples:",
    "    openclaw knight status",
    "    openclaw knight enable guard",
    "    openclaw knight lockdown on",
    "",
  ].join("\n");
}
