
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { error, success } from '../shared/format.js';
import { getRandomUninstallMessage } from '../shared/messages.js';

export function handleUninstallCommand(args: string[]): string {
    const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
    const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
    // We should probably determine the extension dir dynamically if possible, 
    // but hardcoding based on standard install path is safe for this specific request.
    const EXTENSION_DIR = path.join(OPENCLAW_DIR, 'extensions', 'knightclaw');

    // 1. Remove from openclaw.json
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(data);
            let modified = false;

            if (config.plugins?.entries?.knightclaw) {
                delete config.plugins.entries.knightclaw;
                modified = true;
            }

            if (config.plugins?.installs?.knightclaw) {
                delete config.plugins.installs.knightclaw;
                modified = true;
            }

            // Remove from plugins.allow to prevent config validation errors
            if (Array.isArray(config.plugins?.allow)) {
                const idx = config.plugins.allow.indexOf('knightclaw');
                if (idx !== -1) {
                    config.plugins.allow.splice(idx, 1);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
            }
        } catch (e: any) {
            // silent fail, proceed to directory deletion
        }
    }

    // 2. Delete extension folder
    if (fs.existsSync(EXTENSION_DIR)) {
        try {
            fs.rmSync(EXTENSION_DIR, { recursive: true, force: true });
        } catch (e: any) {
            process.stderr.write(`[KnightClaw] Failed to delete extension directory: ${e.message}\n`);
            // silent fail
        }
    }

    // Build output message
    const output = `${success("Uninstalled successfully")}\n\n\x1b[34m⚔️  Sayonara — ${getRandomUninstallMessage()}\x1b[0m`;

    // Print and force exit to prevent background tasks (like semantic guard loading)
    // from crashing when files disappear
    process.stdout.write(output + "\n");
    process.exit(0);
}
