import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
    getGamesByCategory,
    getGamesByFilters,
    getGamesByPublisher,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns all categories and publishers alphabetically', async () => {
        const strategy = await db.insert(categories).values({ name: 'Strategy', description: 'cat' }).returning({ id: categories.id });
        const puzzle = await db.insert(categories).values({ name: 'Puzzle', description: 'cat' }).returning({ id: categories.id });
        const codeForge = await db.insert(publishers).values({ name: 'CodeForge Studios', description: 'pub' }).returning({ id: publishers.id });
        const devMasters = await db.insert(publishers).values({ name: 'DevMasters Inc.', description: 'pub' }).returning({ id: publishers.id });

        await db.insert(games).values({
            title: 'Game A',
            description: 'A',
            starRating: 4.0,
            categoryId: strategy[0].id,
            publisherId: codeForge[0].id,
        });
        await db.insert(games).values({
            title: 'Game B',
            description: 'B',
            starRating: 4.1,
            categoryId: puzzle[0].id,
            publisherId: devMasters[0].id,
        });

        expect(await getAllCategories(db)).toEqual([
            { id: puzzle[0].id, name: 'Puzzle' },
            { id: strategy[0].id, name: 'Strategy' },
        ]);
        expect(await getAllPublishers(db)).toEqual([
            { id: codeForge[0].id, name: 'CodeForge Studios' },
            { id: devMasters[0].id, name: 'DevMasters Inc.' },
        ]);
    });

    it('filters games by category and can combine multiple categories', async () => {
        const strategy = await db.insert(categories).values({ name: 'Strategy', description: 'cat' }).returning({ id: categories.id });
        const puzzle = await db.insert(categories).values({ name: 'Puzzle', description: 'cat' }).returning({ id: categories.id });
        const simulation = await db.insert(categories).values({ name: 'Simulation', description: 'cat' }).returning({ id: categories.id });
        const publisher = await db.insert(publishers).values({ name: 'Pub One', description: 'pub' }).returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'A Strategy', description: 'A', starRating: 4.0, categoryId: strategy[0].id, publisherId: publisher[0].id },
            { title: 'B Puzzle', description: 'B', starRating: 4.2, categoryId: puzzle[0].id, publisherId: publisher[0].id },
            { title: 'C Simulation', description: 'C', starRating: 3.5, categoryId: simulation[0].id, publisherId: publisher[0].id },
        ]);

        const filtered = await getGamesByCategory(db, [strategy[0].id, puzzle[0].id]);
        expect(filtered.map((game) => game.title)).toEqual(['A Strategy', 'B Puzzle']);

        const combined = await getGamesByFilters(db, {
            categoryIds: [strategy[0].id, puzzle[0].id],
            publisherId: publisher[0].id,
        });
        expect(combined.map((game) => game.title)).toEqual(['A Strategy', 'B Puzzle']);
    });

    it('filters games by publisher', async () => {
        const strategy = await db.insert(categories).values({ name: 'Strategy', description: 'cat' }).returning({ id: categories.id });
        const publisherOne = await db.insert(publishers).values({ name: 'Pub One', description: 'pub' }).returning({ id: publishers.id });
        const publisherTwo = await db.insert(publishers).values({ name: 'Pub Two', description: 'pub' }).returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'A Game', description: 'A', starRating: 2.5, categoryId: strategy[0].id, publisherId: publisherOne[0].id },
            { title: 'B Game', description: 'B', starRating: 4.5, categoryId: strategy[0].id, publisherId: publisherTwo[0].id },
        ]);

        const filtered = await getGamesByPublisher(db, publisherOne[0].id);
        expect(filtered.map((game) => game.title)).toEqual(['A Game']);
    });
});
