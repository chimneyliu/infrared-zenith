import { ArxivPaper } from './arxiv';

export interface Cluster {
    id: string;
    name: string;
    papers: ArxivPaper[];
}

export function groupPapers(papers: ArxivPaper[]): Cluster[] {
    // Simple keyword-based clustering for demonstration
    const clusters: Record<string, ArxivPaper[]> = {};

    papers.forEach(paper => {
        const title = paper.title.toLowerCase();
        let assigned = false;

        if (title.includes('llm') || title.includes('language model') || title.includes('gpt')) {
            if (!clusters['LLMs']) clusters['LLMs'] = [];
            clusters['LLMs'].push(paper);
            assigned = true;
        }

        if (title.includes('vision') || title.includes('image') || title.includes('diffusion')) {
            if (!clusters['Computer Vision']) clusters['Computer Vision'] = [];
            clusters['Computer Vision'].push(paper);
            assigned = true;
        }

        if (title.includes('reinforcement') || title.includes('rl')) {
            if (!clusters['Reinforcement Learning']) clusters['Reinforcement Learning'] = [];
            clusters['Reinforcement Learning'].push(paper);
            assigned = true;
        }

        if (!assigned) {
            if (!clusters['Other']) clusters['Other'] = [];
            clusters['Other'].push(paper);
        }
    });

    return Object.entries(clusters).map(([name, papers], index) => ({
        id: `cluster-${index}`,
        name,
        papers
    }));
}
