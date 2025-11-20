
import { analyzePdfBuffer } from './src/lib/analyzer';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Manually load .env if GEMINI_API_KEY is not set
if (!process.env.GEMINI_API_KEY) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/GEMINI_API_KEY=(.*)/);
            if (match && match[1]) {
                let key = match[1].trim();
                // Remove quotes if present
                if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.slice(1, -1);
                }
                process.env.GEMINI_API_KEY = key;
            }
        }
    } catch (e) {
        console.error("Failed to load .env file", e);
    }
}

async function test() {
    try {
        // Test 1: Simple text generation to verify model access
        console.log('Testing simple text generation...');
        try {
            const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '').getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent("Hello, are you there?");
            console.log('Text generation success:', await result.response.text());
        } catch (e) {
            console.error('Text generation failed:', e);
        }

        const pdfPath = path.join(process.cwd(), 'test.pdf');
        if (!fs.existsSync(pdfPath)) {
            // Create a dummy PDF if it doesn't exist (requires pdf-lib or similar, but we don't have it)
            // So we just warn
            console.error("Error: test.pdf not found. Please download it first.");
            return;
        }

        const pdfBuffer = fs.readFileSync(pdfPath);

        console.log('Testing Gemini PDF analysis...');
        const summary = await analyzePdfBuffer(pdfBuffer);
        console.log('Summary:', summary);

        const summaryText = typeof summary === 'string' ? summary : summary.summary;
        if (summaryText && !summaryText.startsWith('Error') && !summaryText.startsWith('Failed')) {
            console.log('SUCCESS: PDF analyzed correctly by Gemini.');
        } else {
            console.error('FAILURE: Analysis failed.');
        }

    } catch (error) {
        console.error('ERROR:', error);
    }
}

test();
