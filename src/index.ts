import path from "node:path";
import fs from "node:fs";
import os from "node:os";
// import { type PluginApi, type PluginConfig, type CommandContext } from "@openclaw/plugin-sdk";
// import { Command } from "commander";

// Minimal type mocks to satisfy compiler if SDK is missing
type PluginApi = any;
type CommandContext = any;
type Command = any;

import { initConfig } from "./config/index.js";
import { initGuard } from "./features/guard/index.js";
import { initLockdown } from "./features/lockdown/index.js";
import { initLogs } from "./features/logs/index.js";
import { registerAllHooks } from "./hooks/index.js";
import { handleCommand, type CommandResult } from "./cli/index.js";
import { getRandomStatusMessage } from "./shared/messages.js";

// ── Resolve Plugin Root Directory ─────────────────────────────────────────────
// OpenClaw loads plugins via CJS require() through jiti, NOT ESM import().
// import.meta.url CANNOT be used here (SyntaxError in CJS context).
// jiti provides __dirname and __filename as CJS globals.
// Gateway daemon mode has CWD="/" which breaks path.resolve("./state").
function resolvePluginRoot(): string {
  // 1. Try to find knightclaw in __dirname (jiti provides this)
  //    In compiled form: dist/src/index.js → __dirname = .../dist/src
  //    Plugin root = up 2 levels
  try {
    // @ts-ignore — __dirname is a CJS global, not available in ESM type declarations
    const dir: string = typeof __dirname === "string" ? __dirname : "";
    if (dir && dir !== "/" && dir !== "." && dir.includes("knightclaw")) {
      return path.resolve(dir, "..", "..");
    }
  } catch { /* __dirname not available */ }

  // 2. Canonical extension path: ~/.openclaw/extensions/knightclaw
  const homeDir = os.homedir();
  if (homeDir) {
    const canonical = path.join(homeDir, ".openclaw", "extensions", "knightclaw");
    if (fs.existsSync(canonical)) return canonical;
  }

  // 3. Fallback: try process.env.HOME
  const envHome = process.env.HOME || process.env.USERPROFILE || "";
  if (envHome) {
    return path.join(envHome, ".openclaw", "extensions", "knightclaw");
  }

  // 4. Absolute last resort
  return process.cwd();
}

const PLUGIN_ROOT = resolvePluginRoot();

// ── Plugin Definition ────────────────────────────────────────────────────────

const knightClawPlugin = {
  id: "knightclaw",
  version: "1.0.0",

  register: (api: PluginApi) => {

    // ── Resolve State Directory ──────────────────────────────────────────
    // Isolate state outside of the plugin directory to prevent OpenClaw's config
    // watcher from triggering endless Gateway restarts every time KnightClaw updates state.
    // This also persists the state and audit logs across `openclaw plugins update` commands.
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    let stateDir = process.env.KNIGHTCLAW_STATE_DIR ||
      (homeDir ? path.join(homeDir, ".openclaw", "knightclaw-state") : path.join(PLUGIN_ROOT, "state"));

    // Ensure state dir exists
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // ── Initialize Config ────────────────────────────────────────────────
    const config = initConfig(stateDir);

    // ── Initialize All Features ──────────────────────────────────────────
    initGuard(config.guard, stateDir);
    initLogs(config.logs, stateDir);
    initLockdown(config.lockdown, stateDir); // Pass stateDir here

    // ── Register Hooks ───────────────────────────────────────────────────
    registerAllHooks(api);

    // ─── Register CLI Commands ────────────────────────────────────────────
    // @ts-ignore - registerCli is the new API name in 2026.2.12
    if (api.registerCli) {
      // Check if we should print the banner (only if user is running a knight command)
      // This allows the banner to appear ABOVE the OpenClaw banner
      if (process.argv.includes("knight") && !process.argv.includes("uninstall")) {
        process.stdout.write(`\n\x1b[34m⚔️  KnightClaw — ${getRandomStatusMessage()}\x1b[0m\n`);
      }

      // @ts-ignore
      api.registerCli(({ program }: any) => {
        const knightCmd = program.command("knight")
          .description("KnightClaw security controls");

        knightCmd
          .command("status")
          .description("Show security dashboard")
          .action(async () => {
            const result = await handleCommand("status");
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("enable <feature>")
          .description("Turn on a security feature")
          .action(async (feature: string) => {
            const result = await handleCommand(`enable ${feature}`);
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("disable <feature>")
          .description("Turn off a security feature (needs --confirm)")
          .option("--confirm", "Confirm disabling the feature")
          .option("-y", "Shortcut for --confirm")
          .action(async (feature: string, opts: { confirm?: boolean; y?: boolean }) => {
            const args = opts.confirm || opts.y ? `disable ${feature} --confirm` : `disable ${feature}`;
            const result = await handleCommand(args);
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("logs [action]")
          .description("Audit logs: tail, verify, export")
          .option("-f, --follow", "Stream logs in real-time")
          .option("--format <type>", "Export format (json)")
          .action(async (action?: string, opts?: { follow?: boolean; format?: string }) => {
            let args = `logs ${action ?? "20"}`;
            if (opts?.follow) args += " --follow";
            if (opts?.format) args += ` --format ${opts.format}`;
            const result = await handleCommand(args);
            if (result.output) process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("lockdown [action]")
          .description("Emergency kill switch (on/off/status)")
          .option("--confirm", "Confirm lockdown deactivation")
          .option("-y", "Shortcut for --confirm")
          .action(async (action?: string, opts?: { confirm?: boolean; y?: boolean }) => {
            let args = `lockdown ${action ?? "status"}`;
            if (opts?.confirm || opts?.y) args += " --confirm";
            const result = await handleCommand(args);
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("help")
          .description("Show help")
          .action(async () => {
            const result = await handleCommand("help");
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("version")
          .description("Show version")
          .action(async () => {
            const result = await handleCommand("version");
            process.stdout.write(result.output + "\n");
          });

        knightCmd
          .command("uninstall")
          .description("Remove KnightClaw (requires --confirm)")
          .option("--confirm", "Confirm uninstallation")
          .option("-y", "Shortcut for --confirm")
          .action(async (opts: { confirm?: boolean; y?: boolean }) => {
            let args = "uninstall";
            if (opts?.confirm || opts?.y) args += " --confirm";
            const result = await handleCommand(args);
            process.stdout.write(result.output + "\n");
          });

        // default action — catch-all for unrecognized subcommands
        knightCmd
          .allowExcessArguments(true)
          .allowUnknownOption(true)
          .action(async (_opts: any, cmd: any) => {
            // cmd.args contains any positional arguments that didn't match a subcommand
            const extra = cmd.args as string[];
            const result = await handleCommand(extra.length > 0 ? extra.join(" ") : "status");
            process.stdout.write(result.output + "\n");
          });
      });
    }

    // ── Register In-Chat Command (`/knight ...`) ─────────────────────
    if (api.registerCommand) {
      api.registerCommand({
        name: "knight",
        description: "KnightClaw security controls",
        acceptsArgs: true,
        handler: async (ctx: CommandContext) => {
          const result = await handleCommand(ctx.args ?? "status");
          return { response: result.output };
        },
      });
    }
  },
};

export default knightClawPlugin;
