import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, FileText, BookmarkPlus, Check, Loader2 } from 'lucide-react';

interface PaperCardProps {
    paper: {
        id: string;
        title: string;
        summary: string;
        authors: string[];
        published: string;
        link: string;
        pdfLink?: string;
        topics?: { id: string; name: string }[];
        institution?: string | null;
    };
    paperId: string;
    onClick: () => void;
    onSave?: (e: React.MouseEvent) => void;
    isSaved?: boolean;
    isSaving?: boolean;
}

export function PaperCard({ paper, paperId, onClick, onSave, isSaved, isSaving }: PaperCardProps) {
    return (
        <TooltipProvider>
            <div
                onClick={onClick}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {paper.title}
                    </h3>
                    {paper.published && (
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {new Date(paper.published).toLocaleDateString()}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    {paper.authors.slice(0, 3).map((author, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-transparent">
                            {author}
                        </Badge>
                    ))}
                    {paper.authors.length > 3 && (
                        <span className="text-xs text-gray-500 px-1 self-center">+{paper.authors.length - 3} more</span>
                    )}
                </div>

                {paper.institution && (
                    <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {paper.institution}
                    </div>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 cursor-help">
                            {paper.summary}
                        </p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md p-3">
                        <p className="text-sm">{paper.summary}</p>
                    </TooltipContent>
                </Tooltip>

                <div className="flex gap-2 mt-auto items-center" onClick={(e) => e.stopPropagation()}>
                    {paper.link && (
                        <a href={paper.link} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                            <ExternalLink size={12} /> View on ArXiv
                        </a>
                    )}
                    {paper.pdfLink && (
                        <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-red-600 hover:underline">
                            <FileText size={12} /> PDF
                        </a>
                    )}
                    {onSave && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 text-xs flex items-center gap-1 ml-auto ${isSaved ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'}`}
                            onClick={onSave}
                            disabled={isSaved || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : isSaved ? (
                                <Check size={12} />
                            ) : (
                                <BookmarkPlus size={12} />
                            )}
                            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                        </Button>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
