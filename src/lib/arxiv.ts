import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface ArxivPaper {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    link: string;
    pdfLink?: string;
    institution?: string | null;
}

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';

async function fetchWithRetry(url: string, params: any, retries = 3, backoff = 1000): Promise<any> {
    try {
        return await axios.get(url, { params });
    } catch (error: any) {
        if (retries > 0 && error.response?.status === 429) {
            console.warn(`ArXiv API rate limit hit. Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, params, retries - 1, backoff * 2);
        }
        throw error;
    }
}

export async function searchArxiv(
    query: string,
    maxResults = 10,
    start = 0,
    sortBy: 'relevance' | 'lastUpdatedDate' | 'submittedDate' = 'submittedDate',
    sortOrder: 'ascending' | 'descending' = 'descending'
): Promise<ArxivPaper[]> {
    try {
        const response = await fetchWithRetry(ARXIV_API_URL, {
            search_query: query,
            start: start,
            max_results: maxResults,
            sortBy: sortBy,
            sortOrder: sortOrder
        });

        const result = await parseStringPromise(response.data);
        const entries = result.feed.entry || [];

        return entries.map((entry: any) => ({
            id: getCleanId(entry.id[0]),
            title: entry.title[0].trim().replace(/\s+/g, ' '),
            summary: entry.summary[0].trim().replace(/\s+/g, ' '),
            authors: entry.author.map((a: any) => a.name[0]),
            published: entry.published[0],
            link: entry.id[0],
            pdfLink: entry.link.find((l: any) => l.$.title === 'pdf')?.$.href,
        }));
    } catch (error) {
        console.error('Error fetching from ArXiv:', error);
        return [];
    }
}



function getCleanId(id: string): string {
    return id.replace(/^http:\/\/arxiv\.org\/abs\//, '').replace(/^https:\/\/arxiv\.org\/abs\//, '');
}
