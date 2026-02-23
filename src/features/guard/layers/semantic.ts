import { GuardLayerResult } from "./types.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Fix: Broken Paths in Prod. Fallback to dist/ if src/ doesn't exist
let localModelPath = path.join(projectRoot, 'dist', 'assets', 'models');
if (!fs.existsSync(localModelPath)) {
    localModelPath = path.join(projectRoot, 'src', 'assets', 'models');
}
const embeddingsPath = path.join(localModelPath, 'attack_embeddings.json');

// Configuration
const MODEL_NAME = 'Xenova/bge-small-en-v1.5';
// Default threshold — used only when detectSemantic is called without a threshold arg.
// Config value (knight.config.json) takes precedence when passed through the pipeline.
const THRESHOLD = 0.65;

let embedder: any = null;
let attackEmbeddings: number[][] | null = null;
let attackCorpus: string[] | null = null;
let initPromise: Promise<void> | null = null;

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    // Fix: Division by zero producing NaN
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Initialize model and LOAD pre-computed embeddings
export async function initSemanticLayer(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Lazy load the heavy transformer library
            const { pipeline, env } = await import('@xenova/transformers');

            // Configure transformers to use local model
            env.allowLocalModels = true;
            env.allowRemoteModels = false; // BUNDLED ONLY
            env.localModelPath = localModelPath;

            // 1. Load Model
            embedder = await pipeline('feature-extraction', MODEL_NAME, {
                quantized: true,
            });

            // 2. Load Pre-computed Embeddings (Instant)
            if (fs.existsSync(embeddingsPath)) {
                const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
                attackCorpus = data.corpus;
                attackEmbeddings = data.embeddings;
            } else {
                console.warn("⚠️ Pre-computed embeddings not found. Semantic layer might cover less scope.");
            }
        } catch (err) {
            console.error("Failed to load Semantic Guard model:", err);
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
}

export async function detectSemantic(text: string, threshold = THRESHOLD): Promise<GuardLayerResult> {
    // SECURITY CRITICAL: Ensure model is loaded before proceeding.
    if (!initPromise) {
        initSemanticLayer();
    }

    try {
        await initPromise;
    } catch (e) {
        // FAIL-OPEN: Semantic is supplementary — 7 other layers still protect.
        // Blocking all traffic on a model load failure is worse than skipping this layer.
        console.warn("[KnightClaw] Semantic Guard failed to initialize (fail-open):", e);
        return {
            blocked: false,
            score: 0,
            reason: undefined,
            metadata: { warning: "Semantic layer unavailable — model load failure", error: String(e) }
        };
    }

    if (!embedder) {
        // FAIL-OPEN: Don't block all traffic because the model didn't load.
        console.warn("[KnightClaw] Semantic Guard embedder is null (fail-open)");
        return {
            blocked: false,
            score: 0,
            metadata: { warning: "Semantic layer unavailable — embedder is null" }
        };
    }

    // Fix: Prevent "Fail Closed" logic if corpus is missing.
    // If we only have the embedder but no embeddings to check against, we must allow traffic
    // to bypass otherwise the entire pipeline is completely blocked by a missing json file.
    if (!attackEmbeddings || !attackCorpus) {
        return {
            blocked: false,
            score: 0,
            metadata: { warning: "No attack corpus loaded" }
        };
    }

    try {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data) as number[];

        let maxSimilarity = 0;
        let bestMatch = '';

        for (let i = 0; i < attackEmbeddings.length; i++) {
            const similarity = cosineSimilarity(embedding, attackEmbeddings[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = attackCorpus[i];
            }
        }

        if (maxSimilarity > threshold) {
            return {
                blocked: true,
                score: maxSimilarity,
                reason: `Semantic injection detected: similarity ${maxSimilarity.toFixed(2)} to "${bestMatch}"`,
                metadata: { maxSimilarity, bestMatch }
            };
        }

        return {
            blocked: false,
            score: maxSimilarity,
            metadata: { maxSimilarity, bestMatch }
        };

    } catch (err) {
        // FAIL-OPEN: Runtime inference error — skip this layer, don't block all traffic.
        console.warn("[KnightClaw] Semantic detection runtime error (fail-open):", err);
        return {
            blocked: false,
            score: 0,
            metadata: { warning: "Semantic layer error during analysis", error: String(err) }
        };
    }
}
