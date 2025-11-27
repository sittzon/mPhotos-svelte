import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import { env } from '$env/dynamic/private'
import path from 'path';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const favoritesFilename = path.join(thumbsDir, env.FAVORITES_FILE || 'favorites.json');

// GET /api/favorites
export const GET: RequestHandler = async ({ url }) => {
    try {
        const exists = await fs.stat(favoritesFilename).then(() => true).catch(() => false);
        // console.log("Favorites file exists:", exists);
        if (!exists) return new Response('Not found', { status: 404 });
        const favoritesArray = await fs.readFile(favoritesFilename, 'utf-8').then(data => JSON.parse(data)) as Array<{ guid: string }>;
        return new Response(JSON.stringify(favoritesArray), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response('Not found', { status: 404 });
    }
};
