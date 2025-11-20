'use server';

import { searchArxiv, ArxivPaper } from '@/lib/arxiv';
import { summarizeText, analyzePdfBuffer } from '@/lib/analyzer';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

import { currentUser } from '@clerk/nextjs/server';

// Helper to get current user (Clerk Auth)
async function getCurrentUser() {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        throw new Error("Unauthorized: Please sign in to continue.");
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
        throw new Error("No email found for user.");
    }

    // Sync Clerk user with Prisma User
    // We use the Clerk ID as the Prisma User ID for consistency, or map it.
    // Here we'll stick to our schema where ID is UUID, but we can store Clerk ID if needed.
    // Actually, simpler to just use email as unique identifier for sync, 
    // OR better: store Clerk ID in a new field. 
    // For now, let's use email to find/create, but ideally we'd add `clerkId` to User model.
    // Let's just use the email for now as it's unique in our schema.

    return await prisma.user.upsert({
        where: { email },
        update: {
            name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim() || clerkUser.username || 'User',
        },
        create: {
            email,
            name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim() || clerkUser.username || 'User',
        },
    });
}

export async function searchPapersAction(query: string, start: number = 0, sortBy: 'relevance' | 'submittedDate' = 'submittedDate'): Promise<ArxivPaper[]> {
    if (!query.trim()) return [];
    return await searchArxiv(query, 10, start, sortBy, 'descending');
}

export async function getLatestPapersAction(category: string = 'cs.AI'): Promise<ArxivPaper[]> {
    // Search for recent papers in the specific category
    // ArXiv search query for category: cat:cs.AI
    return await searchArxiv(`cat:${category}`, 10);
}

export async function analyzePaperAction(text: string): Promise<string> {
    if (!text.trim()) return "No text to analyze.";
    return await summarizeText(text);
}

export async function analyzePaperFromUrlAction(url: string): Promise<string> {
    try {
        // Ensure HTTPS
        const secureUrl = url.replace(/^http:\/\//, 'https://');

        const response = await axios.get(secureUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Use Gemini to analyze the PDF buffer directly
        const result = await analyzePdfBuffer(response.data);
        return result.summary;
    } catch (error) {
        console.error('Error analyzing paper from URL:', error);
        return `Failed to analyze paper. ${(error as Error).message}\n\nStack: ${(error as Error).stack}`;
    }
}

export async function getPaperByIdAction(id: string) {
    // First try to find in saved papers for the current user
    const user = await getCurrentUser();
    const savedPaperEntry = await prisma.savedPaper.findUnique({
        where: {
            userId_paperId: {
                userId: user.id,
                paperId: String(id),
            },
        },
        include: {
            paper: {
                include: { topics: true },
            },
        },
    });

    if (savedPaperEntry) {
        const savedPaper = savedPaperEntry.paper;
        return {
            ...savedPaper,
            authors: JSON.parse(savedPaper.authors),
            published: savedPaper.publishedDate?.toISOString() || '',
            link: savedPaper.url || '',
            pdfLink: savedPaper.filePath || '',
            // Ensure abstract is returned (fallback to summary if abstract is missing for old records)
            abstract: savedPaper.abstract || savedPaper.summary || '',
            // summary is the AI summary
            summary: savedPaper.summary,
            institution: savedPaper.institution,
            isSaved: true,
        };
    }

    // If not found in database, fetch from ArXiv
    try {
        // Extract ArXiv ID from URL format (e.g., 'http://arxiv.org/abs/2309.12307v3' -> '2309.12307v3')
        const arxivId = id.includes('arxiv.org%2Fabs%2F')
            ? id.split('arxiv.org%2Fabs%2F')[1]
            : id;

        console.log(arxivId);

        const papers = await searchArxiv(arxivId, 1);
        if (papers.length > 0) {
            const paper = papers[0];
            return {
                ...paper,
                // Map ArXiv summary to abstract
                abstract: paper.summary,
                // No AI summary yet
                summary: null,
                institution: null,
                isSaved: false,
            };
        }
    } catch (error) {
        console.error('Error fetching paper from ArXiv:', error);
    }

    return null;
}

export async function savePaperAction(paper: ArxivPaper): Promise<void> {
    const user = await getCurrentUser();

    // 1. Ensure paper exists in shared catalog
    await prisma.paper.upsert({
        where: { id: paper.id },
        update: {
            title: paper.title,
            authors: JSON.stringify(paper.authors),
            abstract: paper.summary, // Original abstract from ArXiv
            url: paper.link,
            publishedDate: new Date(paper.published),
            filePath: paper.pdfLink,
        },
        create: {
            id: paper.id,
            title: paper.title,
            authors: JSON.stringify(paper.authors),
            abstract: paper.summary, // Original abstract from ArXiv
            summary: null,           // AI generated summary (initially null)
            institution: null,
            url: paper.link,
            publishedDate: new Date(paper.published),
            filePath: paper.pdfLink,
        },
    });

    // 2. Link paper to user
    await prisma.savedPaper.upsert({
        where: {
            userId_paperId: {
                userId: user.id,
                paperId: paper.id,
            },
        },
        update: {}, // Already saved
        create: {
            userId: user.id,
            paperId: paper.id,
        },
    });

    // 2. Trigger AI analysis in background (fire and forget)
    if (paper.pdfLink) {
        // We don't await this promise, allowing the action to return immediately
        (async () => {
            try {
                const result = await analyzePdfBuffer(
                    (await axios.get(paper.pdfLink!.replace(/^http:\/\//, 'https://'), {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                        }
                    })).data
                );

                // Update the paper with the generated summary, institution, and topics
                await prisma.paper.update({
                    where: { id: paper.id },
                    data: {
                        summary: result.summary,
                        institution: result.institution,
                        topics: {
                            connectOrCreate: result.topics?.map((topic: string) => ({
                                where: { name: topic },
                                create: { name: topic },
                            })) || [],
                        },
                    },
                });
                console.log(`Background analysis completed for paper ${paper.id}`);
            } catch (error) {
                console.error(`Background analysis failed for paper ${paper.id}:`, error);
            }
        })();
    }
}

export async function regenerateSummaryAction(paperId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Fetch the paper from database
        const paper = await prisma.paper.findUnique({
            where: { id: paperId },
        });

        if (!paper) {
            return { success: false, error: 'Paper not found' };
        }

        if (!paper.filePath) {
            return { success: false, error: 'No PDF available for this paper' };
        }

        // 2. Fetch and analyze the PDF
        const secureUrl = paper.filePath.replace(/^http:\/\//, 'https://');
        const response = await axios.get(secureUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const result = await analyzePdfBuffer(response.data);

        // 3. Update the paper with new summary and institution
        await prisma.paper.update({
            where: { id: paperId },
            data: {
                summary: result.summary,
                institution: result.institution,
                topics: {
                    connectOrCreate: result.topics?.map((topic: string) => ({
                        where: { name: topic },
                        create: { name: topic },
                    })) || [],
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error('Error regenerating summary:', error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getSavedPapersAction() {
    const user = await getCurrentUser();
    const savedPapers = await prisma.savedPaper.findMany({
        where: { userId: user.id },
        include: {
            paper: {
                include: { topics: true },
            },
        },
        orderBy: { savedAt: 'desc' },
    });

    return savedPapers.map(entry => {
        const p = entry.paper;
        return {
            ...p,
            authors: JSON.parse(p.authors),
            published: p.publishedDate?.toISOString() || '',
            link: p.url || '',
            pdfLink: p.filePath || '',
            institution: p.institution,
        };
    });
}

export async function suggestTopicsAction(text: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) return [];
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Suggest exactly 3 short, relevant topics or tags for the following research paper text. Return ONLY a JSON array of strings, e.g., ["NLP", "Transformers", "LLM"]. Text: ${text.substring(0, 5000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonString = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error suggesting topics:', error);
        return [];
    }
}

export async function addTopicToPaperAction(paperId: string, topicName: string) {
    const topic = await prisma.topic.upsert({
        where: { name: topicName },
        update: {},
        create: { name: topicName },
    });

    await prisma.paper.update({
        where: { id: paperId },
        data: {
            topics: {
                connect: { id: topic.id },
            },
        },
    });
}

export async function removeTopicFromPaperAction(paperId: string, topicId: string) {
    await prisma.paper.update({
        where: { id: paperId },
        data: {
            topics: {
                disconnect: { id: topicId },
            },
        },
    });
}

export async function deletePaperAction(paperId: string): Promise<void> {
    const user = await getCurrentUser();
    await prisma.savedPaper.delete({
        where: {
            userId_paperId: {
                userId: user.id,
                paperId: paperId,
            },
        },
    });
}
