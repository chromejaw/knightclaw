// ─── KnightClaw CLI Format Helpers ───────────────────────────────────────────
// Pretty terminal output — colors, icons, tables. Zero dependencies.

import type { FeatureStatus, CheckResult } from "./types.js";

// ─── ANSI Colors ─────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

// ─── Status Icons ────────────────────────────────────────────────────────────

export function statusIcon(enabled: boolean): string {
  return enabled ? "🟢" : "🔴";
}

export function actionIcon(allowed: boolean): string {
  return allowed ? "✅" : "🛡️";
}

// ─── Feature Status Table ────────────────────────────────────────────────────

export function formatDashboard(features: FeatureStatus[]): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`${c.bold}${c.cyan}  ⚔️  KnightClaw Security Dashboard${c.reset}`);
  lines.push(`${c.dim}  ─────────────────────────────────────${c.reset}`);
  lines.push("");

  for (const f of features) {
    let icon: string;
    let status: string;

    if (f.name === "lockdown") {
      icon = f.enabled ? "🚨" : "🟢";
      status = f.enabled
        ? `${c.bgRed}${c.bold} ENGAGED ${c.reset}`
        : `${c.green}standby${c.reset}`;
    } else if (f.name === "vault") {
      icon = "🔶";
      status = `${c.yellow}${c.bold}Forging${c.reset}`;
    } else {
      icon = statusIcon(f.enabled);
      status = f.enabled
        ? `${c.green}active${c.reset}`
        : `${c.red}off${c.reset}`;
    }

    // Only show blocked count for guard and lockdown
    const showStats = f.name === "guard" || f.name === "lockdown";
    const stats = showStats ? `  ${c.dim}${f.blocked} blocked${c.reset}` : "";

    lines.push(`  ${icon} ${c.bold}${f.label.padEnd(14)}${c.reset} ${status}${stats}`);
  }

  lines.push("");
  const securityFeatures = features.filter((f) => f.name !== "lockdown");
  const allEnabled = securityFeatures.every((f) => f.enabled);
  if (allEnabled) {
    lines.push(`  ${c.bgGreen}${c.bold} ALL SECURE ${c.reset} Every layer is active.`);
  } else {
    const off = securityFeatures.filter((f) => !f.enabled);
    lines.push(`  ${c.bgRed}${c.bold} WARNING ${c.reset} ${off.length} feature(s) disabled.`);
  }
  lines.push("");

  return lines.join("\n");
}

// ─── Block Notification ──────────────────────────────────────────────────────

export function formatBlock(result: CheckResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${c.bold}${c.red}🛡️ KnightClaw blocked an action${c.reset}`);
  lines.push(`  ${c.dim}Feature: ${result.feature}${c.reset}`);
  lines.push(`  ${c.white}Reason: ${result.reason ?? "Policy violation"}${c.reset}`);

  if (result.suggestion) {
    lines.push(`  ${c.green}Fix: ${result.suggestion}${c.reset}`);
  }

  lines.push("");
  return lines.join("\n");
}

// ─── Simple Messages ─────────────────────────────────────────────────────────

export function success(msg: string): string {
  return `${c.green}✅ ${msg}${c.reset}`;
}

export function warn(msg: string): string {
  return `${c.yellow}⚠️  ${msg}${c.reset}`;
}

export function error(msg: string): string {
  return `${c.red}❌ ${msg}${c.reset}`;
}

export function info(msg: string): string {
  return `${c.blue}ℹ️  ${msg}${c.reset}`;
}

export function banner(): string {
  return [
    "",
    `${c.bold}${c.cyan}  ⚔️  KnightClaw v1.0.0${c.reset}`,
    `${c.dim}  Drop-in security armor for OpenClaw${c.reset}`,
    "",
  ].join("\n");
}
