'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaperByIdAction, analyzePaperFromUrlAction, savePaperAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, FileText, Loader2, BookmarkPlus, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PaperData {
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    summary: string | null;
    institution: string | null;
    published: string;
    link: string;
    pdfLink?: string;
    topics?: { id: string; name: string }[];
    isSaved?: boolean;
}

export default function PaperDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [paper, setPaper] = useState<PaperData | null>(null);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        async function loadPaper() {
            try {
                const data = await getPaperByIdAction(id);
                if (!data) {
                    setError('Paper not found');
                    setLoading(false);
                    return;
                }
                setPaper(data);
                setLoading(false);

                // If we already have an AI summary, use it
                // If we already have an AI summary, use it
                if (data.summary) {
                    setAiSummary(data.summary);
                }
            } catch (err) {
                console.error('Error loading paper:', err);
                setError('Failed to load paper');
                setLoading(false);
            }
        }

        loadPaper();
    }, [id]);

    const handleSave = async () => {
        if (!paper) return;
        setSaving(true);
        try {
            // Convert PaperData to ArxivPaper format
            const arxivPaper = {
                id: paper.id,
                title: paper.title,
                authors: paper.authors,
                summary: paper.abstract || '', // Use abstract as summary for ArxivPaper
                published: paper.published,
                link: paper.link,
                pdfLink: paper.pdfLink || '',
            };
            await savePaperAction(arxivPaper);
            setPaper(prev => prev ? { ...prev, isSaved: true } : null);
            alert('Paper saved to library!');
        } catch (err) {
            console.error('Failed to save paper:', err);
            alert('Failed to save paper');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                </div>
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="text-center py-12">
                    <p className="text-red-500">{error || 'Paper not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {paper.title}
                    </h1>

                    <div className="flex flex-wrap gap-2 mb-4 justify-start">
                        <div className="flex flex-wrap gap-2 mb-4 justify-start">
                            {paper.authors.map((author, i) => (
                                <Badge key={i} variant="outline" className="rounded-full px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-transparent">
                                    {author}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {paper.institution && (
                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                            From: {paper.institution}
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Published: {new Date(paper.published).toLocaleDateString()}</span>
                    </div>
                </header>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                        Abstract
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {paper.abstract || 'No abstract available'}
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                        AI-Generated Summary
                    </h2>
                    {summaryLoading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>Generating summary...</span>
                        </div>
                    ) : aiSummary ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 prose dark:prose-invert max-w-none">
                            <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-gray-500">No PDF available for analysis</p>
                    )}
                </section>

                {paper.topics && paper.topics.length > 0 && (
                    <section className="mb-6">
                        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                            Topics
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {paper.topics.map(topic => (
                                <Badge key={topic.id} variant="outline">
                                    {topic.name}
                                </Badge>
                            ))}
                        </div>
                    </section>
                )}

                <footer className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    {!paper.isSaved ? (
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <BookmarkPlus className="h-4 w-4" />
                            )}
                            {saving ? 'Saving...' : 'Save to Library'}
                        </Button>
                    ) : (
                        <Button variant="secondary" disabled className="gap-2 opacity-100">
                            <Check className="h-4 w-4" />
                            Saved to Library
                        </Button>
                    )}

                    {paper.link && (
                        <Button variant="outline" asChild>
                            <a href={paper.link} target="_blank" rel="noopener noreferrer" className="gap-2">
                                <ExternalLink className="h-4 w-4" />
                                View on ArXiv
                            </a>
                        </Button>
                    )}

                    {paper.pdfLink && (
                        <Button variant="outline" asChild>
                            <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>
                    )}
                </footer>
            </article>
        </div>
    );
}
