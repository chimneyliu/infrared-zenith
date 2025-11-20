
import { PrismaClient } from '@prisma/client';
import { savePaperAction, getSavedPapersAction, deletePaperAction } from '../src/app/actions';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Multi-User Verification ---');

    // 1. Verify User Creation (implicitly via actions)
    console.log('1. Testing savePaperAction (should create default user)...');
    const mockPaper = {
        id: 'http://arxiv.org/abs/2106.09685v2', // LoRA paper
        title: 'LoRA: Low-Rank Adaptation of Large Language Models',
        summary: 'We propose LoRA...',
        authors: ['Edward Hu', 'Yelong Shen'],
        published: '2021-06-17T00:00:00.000Z',
        link: 'http://arxiv.org/abs/2106.09685',
        pdfLink: 'http://arxiv.org/pdf/2106.09685',
    };

    await savePaperAction(mockPaper);
    console.log('   Paper saved.');

    // 2. Verify User exists
    const user = await prisma.user.findUnique({ where: { email: 'demo@infrared-zenith.com' } });
    if (!user) throw new Error('Default user not created!');
    console.log('   User found:', user.email);

    // 3. Verify SavedPaper link
    const savedLink = await prisma.savedPaper.findUnique({
        where: {
            userId_paperId: {
                userId: user.id,
                paperId: mockPaper.id
            }
        }
    });
    if (!savedLink) throw new Error('SavedPaper link not created!');
    console.log('   SavedPaper link confirmed.');

    // 4. Verify getSavedPapersAction
    console.log('2. Testing getSavedPapersAction...');
    const papers = await getSavedPapersAction();
    if (papers.length === 0) throw new Error('No papers returned!');
    if (papers[0].id !== mockPaper.id) throw new Error('Returned paper ID mismatch!');
    console.log(`   Got ${papers.length} papers. First: ${papers[0].title}`);

    // 5. Verify Delete
    console.log('3. Testing deletePaperAction...');
    await deletePaperAction(mockPaper.id);

    const savedLinkAfter = await prisma.savedPaper.findUnique({
        where: {
            userId_paperId: {
                userId: user.id,
                paperId: mockPaper.id
            }
        }
    });
    if (savedLinkAfter) throw new Error('SavedPaper link still exists after delete!');

    // Check if paper still exists in global catalog (it should, based on our logic)
    const paperGlobal = await prisma.paper.findUnique({ where: { id: mockPaper.id } });
    if (!paperGlobal) console.log('   Note: Global paper was also deleted (cascade?) or logic differs.');
    else console.log('   Global paper still exists (correct behavior).');

    console.log('--- Verification Successful ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
