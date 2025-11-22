import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, Trash2, ExternalLink, FileText, RefreshCw, Loader2, Plus, Check, X, Star, Eye, EyeOff } from "lucide-react";
import { ArxivPaper } from '@/lib/arxiv';
import { MultiSelectFilter, DateRangeFilter } from './FilterComponents';

interface SavedPaper extends ArxivPaper {
    topics?: { id: string; name: string }[];
    institution?: string | null;
    isRead?: boolean;
    isStarred?: boolean;
}

interface LibraryTableProps {
    papers: SavedPaper[];
    onRemove: (id: string) => void;
    onRegenerateSummary: (id: string) => void;
    regeneratingId: string | null;
    onAddTopic: (id: string, topic: string) => void;
    onRemoveTopic: (paperId: string, topicId: string) => void;
    onRegenerateAll?: () => void;
    onRegenerateEmpty?: () => void;
    bulkRegenerating?: boolean;
    onToggleRead?: (id: string) => void;
    onToggleStar?: (id: string) => void;
}

type SortConfig = {
    key: keyof SavedPaper | 'firstAuthor';
    direction: 'asc' | 'desc';
} | null;

export function LibraryTable({
    papers,
    onRemove,
    onRegenerateSummary,
    regeneratingId,
    onAddTopic,
    onRemoveTopic,
    onRegenerateAll,
    onRegenerateEmpty,
    bulkRegenerating = false,
    onToggleRead,
    onToggleStar
}: LibraryTableProps) {
    const [filters, setFilters] = useState({
        starred: 'all' as 'all' | 'starred' | 'unstarred',
        title: '',
        authors: '',
        institutions: [] as string[],
        publishedStart: '',
        publishedEnd: '',
        read: 'all' as 'all' | 'read' | 'unread',
        labels: [] as string[],
        abstract: ''
    });

    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [newTopic, setNewTopic] = useState('');

    // Extract unique options for multi-selects
    const uniqueInstitutions = useMemo(() => {
        const institutions = new Set<string>();
        papers.forEach(p => {
            if (p.institution) institutions.add(p.institution);
        });
        return Array.from(institutions).sort();
    }, [papers]);

    const uniqueLabels = useMemo(() => {
        const labels = new Set<string>();
        papers.forEach(p => {
            p.topics?.forEach(t => labels.add(t.name));
        });
        return Array.from(labels).sort();
    }, [papers]);

    const handleStartAddTopic = (paperId: string) => {
        setEditingTopicId(paperId);
        setNewTopic('');
    };

    const handleCancelAddTopic = () => {
        setEditingTopicId(null);
        setNewTopic('');
    };

    const handleSubmitTopic = (paperId: string) => {
        if (newTopic.trim()) {
            onAddTopic(paperId, newTopic.trim());
            handleCancelAddTopic();
        }
    };

    const handleSort = (key: keyof SavedPaper | 'firstAuthor') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const filteredAndSortedPapers = useMemo(() => {
        let result = [...papers];

        // Apply Filters
        if (filters.starred !== 'all') {
            result = result.filter(p => filters.starred === 'starred' ? p.isStarred : !p.isStarred);
        }
        if (filters.title) {
            result = result.filter(p => p.title.toLowerCase().includes(filters.title.toLowerCase()));
        }
        if (filters.authors) {
            result = result.filter(p => p.authors.some(a => a.toLowerCase().includes(filters.authors.toLowerCase())));
        }
        if (filters.institutions.length > 0) {
            result = result.filter(p => p.institution && filters.institutions.includes(p.institution));
        }
        if (filters.publishedStart) {
            result = result.filter(p => new Date(p.published) >= new Date(filters.publishedStart));
        }
        if (filters.publishedEnd) {
            result = result.filter(p => new Date(p.published) <= new Date(filters.publishedEnd));
        }
        if (filters.read !== 'all') {
            result = result.filter(p => filters.read === 'read' ? p.isRead : !p.isRead);
        }
        if (filters.labels.length > 0) {
            result = result.filter(p => p.topics?.some(t => filters.labels.includes(t.name)));
        }
        if (filters.abstract) {
            result = result.filter(p => p.summary?.toLowerCase().includes(filters.abstract.toLowerCase()));
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = '';
                let bValue: any = '';

                switch (sortConfig.key) {
                    case 'firstAuthor':
                        aValue = a.authors[0] || '';
                        bValue = b.authors[0] || '';
                        break;
                    case 'published':
                        aValue = new Date(a.published).getTime();
                        bValue = new Date(b.published).getTime();
                        break;
                    default:
                        aValue = a[sortConfig.key as keyof SavedPaper] || '';
                        bValue = b[sortConfig.key as keyof SavedPaper] || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [papers, filters, sortConfig]);

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2 ml-auto">
                        {onRegenerateEmpty && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRegenerateEmpty}
                                disabled={bulkRegenerating}
                            >
                                {bulkRegenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Regenerate Empty
                                    </>
                                )}
                            </Button>
                        )}
                        {onRegenerateAll && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRegenerateAll}
                                disabled={bulkRegenerating}
                            >
                                {bulkRegenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Regenerate All
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[200px]">
                                    <Button variant="ghost" onClick={() => handleSort('title')} className="h-8 text-left font-bold p-0 hover:bg-transparent">
                                        Title
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[150px]">
                                    <Button variant="ghost" onClick={() => handleSort('firstAuthor')} className="h-8 text-left font-bold p-0 hover:bg-transparent">
                                        Authors
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    <Button variant="ghost" onClick={() => handleSort('institution')} className="h-8 text-left font-bold p-0 hover:bg-transparent">
                                        Institution
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    <Button variant="ghost" onClick={() => handleSort('published')} className="h-8 text-left font-bold p-0 hover:bg-transparent">
                                        Published
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[80px]">Read</TableHead>
                                <TableHead className="w-[150px]">Labels</TableHead>
                                <TableHead className="min-w-[200px]">Abstract</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="p-2">
                                    <select
                                        className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={filters.starred}
                                        onChange={(e) => setFilters(prev => ({ ...prev, starred: e.target.value as any }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="starred">★</option>
                                        <option value="unstarred">☆</option>
                                    </select>
                                </TableHead>
                                <TableHead className="p-2">
                                    <Input
                                        placeholder="Filter title..."
                                        value={filters.title}
                                        onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                                        className="h-7 text-xs"
                                    />
                                </TableHead>
                                <TableHead className="p-2">
                                    <Input
                                        placeholder="Filter authors..."
                                        value={filters.authors}
                                        onChange={(e) => setFilters(prev => ({ ...prev, authors: e.target.value }))}
                                        className="h-7 text-xs"
                                    />
                                </TableHead>
                                <TableHead className="p-2">
                                    <MultiSelectFilter
                                        options={uniqueInstitutions}
                                        selected={filters.institutions}
                                        onChange={(selected) => setFilters(prev => ({ ...prev, institutions: selected }))}
                                        placeholder="Inst..."
                                        searchPlaceholder="Search inst..."
                                    />
                                </TableHead>
                                <TableHead className="p-2">
                                    <DateRangeFilter
                                        start={filters.publishedStart}
                                        end={filters.publishedEnd}
                                        onChange={(start, end) => setFilters(prev => ({ ...prev, publishedStart: start, publishedEnd: end }))}
                                    />
                                </TableHead>
                                <TableHead className="p-2">
                                    <select
                                        className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={filters.read}
                                        onChange={(e) => setFilters(prev => ({ ...prev, read: e.target.value as any }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="read">Read</option>
                                        <option value="unread">Unread</option>
                                    </select>
                                </TableHead>
                                <TableHead className="p-2">
                                    <MultiSelectFilter
                                        options={uniqueLabels}
                                        selected={filters.labels}
                                        onChange={(selected) => setFilters(prev => ({ ...prev, labels: selected }))}
                                        placeholder="Labels..."
                                        searchPlaceholder="Search labels..."
                                    />
                                </TableHead>
                                <TableHead className="p-2">
                                    <Input
                                        placeholder="Filter abstract..."
                                        value={filters.abstract}
                                        onChange={(e) => setFilters(prev => ({ ...prev, abstract: e.target.value }))}
                                        className="h-7 text-xs"
                                    />
                                </TableHead>
                                <TableHead className="p-2"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedPapers.map((paper) => (
                                <TableRow key={paper.id}>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-8 w-8 ${paper.isStarred ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-500'}`}
                                            onClick={() => onToggleStar?.(paper.id)}
                                        >
                                            <Star size={16} fill={paper.isStarred ? "currentColor" : "none"} />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="space-y-1">
                                            <a href={`/paper/${encodeURIComponent(paper.id)}`} className="hover:underline text-blue-600 dark:text-blue-400 block line-clamp-2">
                                                {paper.title}
                                            </a>
                                            <div className="flex gap-2">
                                                {paper.link && (
                                                    <a href={paper.link} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                                        <ExternalLink size={10} /> ArXiv
                                                    </a>
                                                )}
                                                {paper.pdfLink && (
                                                    <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                                        <FileText size={10} /> PDF
                                                    </a>
                                                )}
                                            </div>

                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {paper.authors.slice(0, 2).map((author, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] whitespace-nowrap">
                                                    {author}
                                                </Badge>
                                            ))}
                                            {paper.authors.length > 2 && (
                                                <span className="text-xs text-gray-500">+{paper.authors.length - 2}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {paper.institution ? (
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {paper.institution}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm whitespace-nowrap">
                                            {new Date(paper.published).toLocaleDateString()}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-8 w-8 ${paper.isRead ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-green-500'}`}
                                            onClick={() => onToggleRead?.(paper.id)}
                                            title={paper.isRead ? "Mark as unread" : "Mark as read"}
                                        >
                                            {paper.isRead ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 items-center min-w-[200px]">
                                            {paper.topics?.map((topic) => (
                                                <Badge
                                                    key={topic.id}
                                                    variant="secondary"
                                                    className="rounded-full text-[10px] px-2.5 py-0.5 h-6 whitespace-nowrap group relative pr-6 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-default border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                                >
                                                    {topic.name}
                                                    <button
                                                        onClick={() => onRemoveTopic(paper.id, topic.id)}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </Badge>
                                            ))}
                                            {editingTopicId === paper.id ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        value={newTopic}
                                                        onChange={(e) => setNewTopic(e.target.value)}
                                                        className="h-6 w-24 text-xs px-1"
                                                        placeholder="New label"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSubmitTopic(paper.id);
                                                            if (e.key === 'Escape') handleCancelAddTopic();
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleSubmitTopic(paper.id)}
                                                    >
                                                        <Check size={12} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-gray-600"
                                                        onClick={handleCancelAddTopic}
                                                    >
                                                        <X size={12} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 rounded-full border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                                                    onClick={() => handleStartAddTopic(paper.id)}
                                                >
                                                    <Plus size={14} className="text-gray-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 min-w-[200px] cursor-help">
                                                    {paper.summary}
                                                </p>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-md p-3">
                                                <p className="text-sm">{paper.summary}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs w-full"
                                                onClick={() => onRegenerateSummary(paper.id)}
                                                disabled={regeneratingId === paper.id}
                                            >
                                                {regeneratingId === paper.id ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                                {regeneratingId === paper.id ? 'Regenerating...' : 'Regenerate'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => onRemove(paper.id)}
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" /> Remove
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredAndSortedPapers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                        No papers found matching your filter.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
