
import { pipeline, env } from '@xenova/transformers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MODELS_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'models');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'data');
const CSV_FILE = path.join(DATA_DIR, 'jailbreak_prompts.csv');
const OUTPUT_FILE = path.join(MODELS_DIR, 'attack_embeddings.json');

// Use local model configuration
env.localModelPath = MODELS_DIR;
env.cacheDir = MODELS_DIR;
env.allowLocalModels = true;
env.allowRemoteModels = false;

// Simple CSV Parser handling quoted fields and newlines
function parseCSV(csvText: string): string[] {
    const prompts: string[] = [];
    let state = 'start'; // start, field, quoted-field
    let field = '';
    let colIndex = 0;

    // We expect: platform,source,prompt,... (prompt is index 2)
    const TARGET_COL = 2;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (state === 'start' || state === 'field') {
            if (char === '"') {
                state = 'quoted-field';
            } else if (char === ',') {
                // End of field
                if (colIndex === TARGET_COL) {
                    // Do nothing, we collect at end of field
                }
                colIndex++;
                field = '';
                state = 'field';
            } else if (char === '\n' || char === '\r') {
                // End of row
                if (colIndex === TARGET_COL) {
                    // Last field was the target (unlikely for this CSV but handling edge case)
                }
                colIndex = 0;
                field = '';
                state = 'start';
            } else {
                if (colIndex === TARGET_COL) field += char;
            }
        } else if (state === 'quoted-field') {
            if (char === '"') {
                // Check if escaped quote
                if (csvText[i + 1] === '"') {
                    if (colIndex === TARGET_COL) field += '"';
                    i++; // Skip next quote
                } else {
                    // End of quoted field
                    state = 'field';
                    if (colIndex === TARGET_COL) {
                        if (field.trim().length > 10) { // Filter tiny prompts
                            prompts.push(field.trim());
                        }
                    }
                }
            } else {
                if (colIndex === TARGET_COL) field += char;
            }
        }
    }
    return prompts;
}

// Robust fallback parsing using library if needed, but manual state machine above should handle standard CSV RFC4180
// Actually, let's just use a simpler line-based approach assuming standard formatting if the above is too complex to debug blindly.
// Better: Split by `\n` but merge lines if inside quotes.

function parseCSVRobust(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const prompts: string[] = [];
    let insideQuote = false;
    let currentField = '';

    // Header skip
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        // This is tricky without a proper parser.
        // Let's use a regex that matches the specific structure of THIS dataset.
        // standard format: platform,source,"PROMPT",jailbreak...

        // Match 3rd column which is quoted. 
        // ^[^,]+,[^,]+,"(CONTENT)",...

        // But content can have newlines.
        // Let's just Regex match the prompt column directly if possible.
        // ".*?" matches non-greedy, but with newlines logic is hard.
    }

    // Let's rely on the state machine parser I wrote above, it's safer.
    return parseCSV(content);
}


async function generate() {
    try {
        console.log(`Loading model from: ${MODELS_DIR}`);
        // Use the NEW model
        const embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
            quantized: true,
        });

        console.log(`Reading dataset from: ${CSV_FILE}`);
        const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

        console.log("Parsing CSV...");
        // Using the state machine parser
        let datasetPrompts = parseCSV(csvContent);

        // Filter out header if it got in (unlikely with logic, but safety check)
        datasetPrompts = datasetPrompts.filter(p => p !== 'prompt' && p.length > 20); // Min length to avoid noise

        // Deduplicate
        datasetPrompts = [...new Set(datasetPrompts)];

        console.log(`Found ${datasetPrompts.length} unique prompts.`);

        // Slice if too big? User said "more than 500". 1400 is fine.
        // Let's take all of them.

        console.log("Computing embeddings...");

        // Batch processing to avoid memory issues
        const BATCH_SIZE = 50;
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < datasetPrompts.length; i += BATCH_SIZE) {
            const batch = datasetPrompts.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(datasetPrompts.length / BATCH_SIZE)}`);

            const output = await Promise.all(
                batch.map(text => embedder(text, { pooling: 'mean', normalize: true }))
            );

            for (const out of output) {
                allEmbeddings.push(Array.from(out.data));
            }
        }

        const output = {
            corpus: datasetPrompts,
            embeddings: allEmbeddings
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');
        console.log(`✅ Saved pre-computed embeddings to: ${OUTPUT_FILE}`);
        console.log(`Size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error("❌ Generation failed:", error);
        process.exit(1);
    }
}

generate();
