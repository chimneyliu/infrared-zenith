import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MultiSelectFilterProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
}

export function MultiSelectFilter({
    options,
    selected,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search..."
}: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(search.toLowerCase())
    );

    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="outline"
                size="sm"
                className="w-full justify-between font-normal text-xs h-8"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 ? (
                    <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                    <span className="truncate">
                        {selected.length} selected
                    </span>
                )}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
            </Button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 p-2">
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 text-xs mb-2"
                        autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredOptions.length === 0 ? (
                            <div className="text-xs text-center py-2 text-gray-500">No results</div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-xs"
                                    onClick={() => toggleOption(option)}
                                >
                                    <div className={`w-3 h-3 border rounded flex items-center justify-center ${selected.includes(option) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                        {selected.includes(option) && <Check className="h-2 w-2 text-white" />}
                                    </div>
                                    <span className="truncate">{option}</span>
                                </div>
                            ))
                        )}
                    </div>
                    {selected.length > 0 && (
                        <div className="pt-2 mt-2 border-t flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-red-500 hover:text-red-600"
                                onClick={() => onChange([])}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface DateRangeFilterProps {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
}

export function DateRangeFilter({ start, end, onChange }: DateRangeFilterProps) {
    return (
        <div className="flex flex-col gap-1">
            <Input
                type="date"
                value={start}
                onChange={(e) => onChange(e.target.value, end)}
                className="h-7 text-[10px] px-1"
                placeholder="Start"
            />
            <Input
                type="date"
                value={end}
                onChange={(e) => onChange(start, e.target.value)}
                className="h-7 text-[10px] px-1"
                placeholder="End"
            />
        </div>
    );
}
