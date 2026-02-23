
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const EXTENSION_DIR = path.join(OPENCLAW_DIR, 'extensions', 'knightclaw');

console.log(`[Uninstall] Target Config: ${CONFIG_PATH}`);
console.log(`[Uninstall] Target Dir:    ${EXTENSION_DIR}`);

// 1. Remove from openclaw.json
if (fs.existsSync(CONFIG_PATH)) {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(data);
        let modified = false;

        if (config.plugins?.entries?.knightclaw) {
            delete config.plugins.entries.knightclaw;
            modified = true;
            console.log('[Uninstall] Removed plugin entry from config.');
        }

        if (config.plugins?.installs?.knightclaw) {
            delete config.plugins.installs.knightclaw;
            modified = true;
            console.log('[Uninstall] Removed installation record from config.');
        }

        if (modified) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
            console.log('[Uninstall] Config updated successfully.');
        } else {
            console.log('[Uninstall] No config entries found to remove.');
        }
    } catch (e) {
        console.error(`[Uninstall] Error updating config: ${e.message}`);
        process.exit(1);
    }
} else {
    console.warn('[Uninstall] Custom openclaw.json not found.');
}

// 2. Delete extension folder
if (fs.existsSync(EXTENSION_DIR)) {
    try {
        fs.rmSync(EXTENSION_DIR, { recursive: true, force: true });
        console.log('[Uninstall] Extension directory deleted.');
    } catch (e) {
        console.error(`[Uninstall] Error deleting directory: ${e.message}`);
        process.exit(1);
    }
} else {
    console.log('[Uninstall] Extension directory not found (already deleted?).');
}

console.log('\n[Uninstall] KnightClaw has been removed from OpenClaw.');
