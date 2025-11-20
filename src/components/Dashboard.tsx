'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaperCard } from '@/components/PaperCard';
import { LibraryTable } from '@/components/LibraryTable';
import { searchPapersAction, getLatestPapersAction, savePaperAction, getSavedPapersAction, suggestTopicsAction, addTopicToPaperAction, deletePaperAction, regenerateSummaryAction, removeTopicFromPaperAction } from '@/app/actions';
import { groupPapers, Cluster } from '@/lib/clustering';
import { Loader2, Search, Layers, Sparkles, Library, Plus, Tag, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArxivPaper } from '@/lib/arxiv';
import { Badge } from '@/components/ui/badge';
import { UserButton } from "@clerk/nextjs";

interface SavedPaper extends ArxivPaper {
    topics?: { id: string; name: string }[];
}

export default function Dashboard() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [papers, setPapers] = useState<ArxivPaper[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [recommendations, setRecommendations] = useState<ArxivPaper[]>([]);
    const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [sortBy, setSortBy] = useState<'relevance' | 'submittedDate'>('submittedDate');
    const [taggingId, setTaggingId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

    const fetchSaved = async () => {
        try {
            const saved = await getSavedPapersAction();
            // Ensure summary is string, not null
            const sanitizedSaved: SavedPaper[] = saved.map(p => ({
                ...p,
                summary: p.abstract || p.summary || '',
            }));
            setSavedPapers(sanitizedSaved);
        } catch (error) {
            console.error('Failed to fetch saved papers:', error);
        }
    };

    useEffect(() => {
        // Fetch recommendations and saved papers on mount
        const init = async () => {
            try {
                const recs = await getLatestPapersAction('cs.AI');
                setRecommendations(recs);
                await fetchSaved();
            } catch (error) {
                console.error('Failed to init:', error);
            }
        };
        init();
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setOffset(0);
        setHasMore(true);
        try {
            const results = await searchPapersAction(query, 0, sortBy);
            setPapers(results);
            setClusters(groupPapers(results));
            if (results.length < 10) setHasMore(false);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSortChange = (value: string) => {
        const newSort = value as 'relevance' | 'submittedDate';
        setSortBy(newSort);
        // Trigger search with new sort if query exists
        if (query.trim()) {
            // We need to call search again.
            // Since handleSearch uses the state 'query', we can just call a new search function or duplicate logic.
            // Better to extract search logic, but for now let's just call the action directly to avoid stale state issues if we were to use handleSearch(e)

            // Actually, let's just trigger the effect of searching.
            // But we don't have a useEffect for search.
            // Let's manually trigger it.
            (async () => {
                setLoading(true);
                setOffset(0);
                setHasMore(true);
                try {
                    const results = await searchPapersAction(query, 0, newSort);
                    setPapers(results);
                    setClusters(groupPapers(results));
                    if (results.length < 10) setHasMore(false);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setLoading(false);
                }
            })();
        }
    };

    const handleLoadMore = async () => {
        if (!query.trim() || loadingMore) return;
        setLoadingMore(true);
        const newOffset = offset + 10;
        try {
            const results = await searchPapersAction(query, newOffset, sortBy);
            if (results.length === 0) {
                setHasMore(false);
            } else {
                setPapers(prev => [...prev, ...results]);
                setOffset(newOffset);
                if (results.length < 10) setHasMore(false);
            }
        } catch (error) {
            console.error('Load more failed:', error);
        } finally {
            setLoadingMore(false);
        }
    };



    const handleSave = async (paper: ArxivPaper) => {
        setSavingId(paper.id);
        try {
            await savePaperAction(paper);
            await fetchSaved();
            // alert('Paper saved to Library!'); // Removed alert for better UX with button state
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save paper');
        } finally {
            setSavingId(null);
        }
    };

    const handleAutoTag = async (paper: SavedPaper) => {
        setTaggingId(paper.id);
        try {
            const text = paper.summary + " " + paper.title;
            const topics = await suggestTopicsAction(text);
            for (const topic of topics) {
                await addTopicToPaperAction(paper.id, topic);
            }
            await fetchSaved();
        } catch (error) {
            console.error('Auto-tag failed:', error);
        } finally {
            setTaggingId(null);
        }
    };

    const handleRemove = async (paperId: string) => {
        if (!confirm('Are you sure you want to remove this paper from your library?')) return;
        try {
            await deletePaperAction(paperId);
            await fetchSaved();
        } catch (error) {
            console.error('Remove failed:', error);
        }
    };

    const handleRegenerateSummary = async (paperId: string) => {
        setRegeneratingId(paperId);
        try {
            const result = await regenerateSummaryAction(paperId);
            if (result.success) {
                await fetchSaved();
            } else {
                alert(`Failed to regenerate summary: ${result.error}`);
            }
        } catch (error) {
            console.error('Regenerate summary failed:', error);
            alert('Failed to regenerate summary');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleAddTopic = async (paperId: string, topic: string) => {
        try {
            await addTopicToPaperAction(paperId, topic);
            await fetchSaved();
        } catch (error) {
            console.error('Failed to add topic:', error);
            alert('Failed to add topic');
        }
    };

    const handleRemoveTopic = async (paperId: string, topicId: string) => {
        try {
            await removeTopicFromPaperAction(paperId, topicId);
            await fetchSaved();
        } catch (error) {
            console.error('Failed to remove topic:', error);
            alert('Failed to remove topic');
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <header className="mb-8 flex flex-col items-center relative">
                <div className="absolute right-0 top-0">
                    <UserButton afterSignOutUrl="/" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Infrared Zenith</h1>
                <p className="text-gray-600 dark:text-gray-400">Organize, Analyze, and Discover Research Papers</p>
            </header>

            <Tabs defaultValue="library" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList>
                        <TabsTrigger value="library" className="flex items-center gap-2"><Library size={16} /> Library</TabsTrigger>
                        <TabsTrigger value="search" className="flex items-center gap-2"><Search size={16} /> Search</TabsTrigger>
                        <TabsTrigger value="clusters" className="flex items-center gap-2"><Layers size={16} /> Clusters</TabsTrigger>
                        <TabsTrigger value="recommendations" className="flex items-center gap-2"><Sparkles size={16} /> For You</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="search">
                    <div className="mb-8 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <Input
                                placeholder="Search papers (e.g., 'LLM agents', 'quantum computing')..."
                                className="pl-10 py-6 text-lg"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="w-48">
                            <select
                                className="w-full h-full px-3 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-300"
                                value={sortBy}
                                onChange={(e) => handleSortChange(e.target.value)}
                            >
                                <option value="relevance">Sort by Relevance</option>
                                <option value="submittedDate">Sort by Date</option>
                            </select>
                        </div>
                        <Button size="lg" onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Search'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {papers.map((paper) => (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                paperId={paper.id}
                                onClick={() => router.push(`/paper/${encodeURIComponent(paper.id)}`)}
                                onSave={(e) => {
                                    e.stopPropagation();
                                    handleSave(paper);
                                }}
                                isSaved={savedPapers.some(p => p.id === paper.id)}
                                isSaving={savingId === paper.id}
                            />
                        ))}
                    </div>

                    {papers.length > 0 && hasMore && (
                        <div className="mt-8 text-center">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                Load More Results
                            </Button>
                        </div>
                    )}

                    {papers.length === 0 && !loading && (
                        <div className="text-center text-gray-500 mt-12">
                            <p>No papers found. Try searching for a topic like "LLM agents" or "quantum computing".</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="library">
                    {savedPapers.length > 0 ? (
                        <LibraryTable
                            papers={savedPapers}
                            onRemove={handleRemove}
                            onRegenerateSummary={handleRegenerateSummary}
                            regeneratingId={regeneratingId}
                            onAddTopic={handleAddTopic}
                            onRemoveTopic={handleRemoveTopic}
                        />
                    ) : (
                        <div className="text-center text-gray-500 mt-12">
                            <Library className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p>Your library is empty. Search for papers and save them here.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="clusters">
                    {clusters.length > 0 ? (
                        <div className="space-y-8">
                            {clusters.map((cluster) => (
                                <div key={cluster.id} className="border rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50">
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <Layers size={20} className="text-blue-500" />
                                        {cluster.name}
                                        <span className="text-sm font-normal text-gray-500">({cluster.papers.length} papers)</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {cluster.papers.map((paper) => (
                                            <PaperCard
                                                key={paper.id}
                                                paper={paper}
                                                paperId={paper.id}
                                                onClick={() => router.push(`/paper/${encodeURIComponent(paper.id)}`)}
                                                onSave={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(paper);
                                                }}
                                                isSaved={savedPapers.some(p => p.id === paper.id)}
                                                isSaving={savingId === paper.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 mt-12">
                            <p>Search for papers first to see them grouped into clusters.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="recommendations">
                    <div className="text-center py-12">
                        <Sparkles className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Daily Recommendations</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Latest papers from ArXiv (cs.AI)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            {recommendations.map((paper) => <PaperCard
                                key={paper.id}
                                paper={paper}
                                paperId={paper.id}
                                onClick={() => router.push(`/paper/${encodeURIComponent(paper.id)}`)}
                                onSave={(e) => {
                                    e.stopPropagation();
                                    handleSave(paper);
                                }}
                                isSaved={savedPapers.some(p => p.id === paper.id)}
                                isSaving={savingId === paper.id}
                            />
                            )}
                            {recommendations.length === 0 && (
                                <div className="col-span-2 text-center">Loading recommendations...</div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
