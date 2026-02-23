
import { pipeline, env } from '@xenova/transformers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MODELS_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'models');

// Configure to download to our local folder
env.localModelPath = MODELS_DIR;
env.cacheDir = MODELS_DIR;
env.allowLocalModels = false; // Force download

console.log(`Downloading model to: ${MODELS_DIR}`);

if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
}

async function download() {
    try {
        console.log("Starting download of Xenova/bge-small-en-v1.5...");
        // Just initializing the pipeline triggers the download
        await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
            quantized: true,
            // progress_callback: (p: any) => console.log(p) // Optional progress
        });
        console.log("\n✅ Model downloaded successfully!");
        console.log(`Check ${MODELS_DIR}/Xenova/bge-small-en-v1.5`);
    } catch (error) {
        console.error("❌ Download failed:", error);
        process.exit(1);
    }
}

download();
