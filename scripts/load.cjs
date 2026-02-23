#!/usr/bin/env node
// ─── KnightClaw Loader ──────────────────────────────────────────────────────
// Adds "knightclaw" to plugins.allow in openclaw.json.
// Run this ONCE after `openclaw plugins install` to activate KnightClaw.
//
// Works from any directory, any OS.
// Usage:
//   npx knightclaw-load          (when published to npm)
//   node <path>/scripts/load.cjs (local)
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PLUGIN_ID = "knightclaw";

// ── Resolve home directory (cross-platform) ─────────────────────────────────
function getHomeDir() {
    // os.homedir() handles macOS, Linux, and Windows
    const home = os.homedir();
    if (home) return home;

    // Fallback: environment variables
    return process.env.HOME || process.env.USERPROFILE || "";
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
    const homeDir = getHomeDir();
    if (!homeDir) {
        console.error("❌ Could not determine home directory.");
        process.exit(1);
    }

    const configPath = path.join(homeDir, ".openclaw", "openclaw.json");

    // Check OpenClaw is installed
    if (!fs.existsSync(configPath)) {
        console.error("❌ OpenClaw config not found at: " + configPath);
        console.error("   Is OpenClaw installed? Run: npm install -g openclaw");
        process.exit(1);
    }

    // Check KnightClaw extension is installed
    const extensionDir = path.join(homeDir, ".openclaw", "extensions", PLUGIN_ID);
    if (!fs.existsSync(extensionDir)) {
        console.error("❌ KnightClaw extension not found at: " + extensionDir);
        console.error("   Install it first: openclaw plugins install knightclaw");
        process.exit(1);
    }

    // Read config
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (err) {
        console.error("❌ Failed to read OpenClaw config: " + err.message);
        process.exit(1);
    }

    // Ensure plugins object
    if (!config.plugins) config.plugins = {};

    // Read or create the allow array
    const allow = Array.isArray(config.plugins.allow) ? config.plugins.allow : [];

    // Already loaded?
    if (allow.includes(PLUGIN_ID)) {
        console.log("⚔️  KnightClaw is already loaded. You're good to go!");
        console.log("   Run: openclaw knight status");
        process.exit(0);
    }

    // Add and save
    allow.push(PLUGIN_ID);
    config.plugins.allow = allow;

    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    } catch (err) {
        console.error("❌ Failed to write config: " + err.message);
        process.exit(1);
    }

    console.log("⚔️  KnightClaw loaded successfully!");
    console.log("   Run: openclaw knight status");
}

main();
