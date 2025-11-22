import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini lazily
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
    return genAI;
}

/**
 * Analyzes a PDF buffer using Google Gemini's native multimodal capabilities.
 */
export async function analyzePdfBuffer(buffer: Buffer): Promise<{ summary: string; institution: string; topics: string[] }> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not found in environment variables.");
    }

    try {
        const model = getGenAI().getGenerativeModel({ model: "gemini-flash-latest" });

        // Convert Buffer to base64 string
        const base64Data = buffer.toString('base64');

        const allowedTopics = [
            "Distributed Machine Learning",
            "Model Performance Optimization",
            "Personalized Advertising",
            "Recommendation System",
            "Generative Recommendation",
            "Reinforcement Learning",
            "Agent",
            "Large Language Models",
            "Model Architecture"
        ];

        const prompt = `Analyze the following research paper and provide:
        1. A concise summary focusing on main contributions, methodology, and key results.
        2. The name of the primary company or research institution associated with the authors.
        3. A list of exactly 3 key topic labels or tags relevant to the paper. 

        Allowed Topics:
        ${allowedTopics.map(t => `- ${t}`).join('\n')}

        Return ONLY a JSON object with the following format:
        {
            "summary": "The summary text...",
            "institution": "The institution name...",
            "topics": ["Topic 1", "Topic 2", "Topic 3"]
        }`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse Gemini response as JSON:', text);
            // Fallback for non-JSON response
            return {
                summary: text,
                institution: '',
                topics: []
            };
        }
    } catch (error) {
        console.error('Error analyzing PDF with Gemini:', error);
        throw new Error(`Failed to analyze PDF. ${(error as Error).message}`);
    }
}


