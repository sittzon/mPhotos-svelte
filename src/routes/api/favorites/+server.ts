import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
// import { config } from '$config';
import { env } from '$env/dynamic/private'
import path from 'path';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const favoritesFilename = path.join(thumbsDir, 'favorites.json');

// GET /api/favorites
export const GET: RequestHandler = async ({ params }) => {
    try {
        const exists = await fs.stat(favoritesFilename).then(() => true).catch(() => false);
        if (!exists) return new Response('Not found', { status: 404 });
        const b = await fs.readFile(favoritesFilename);
        // console.log(`Serving photo ${guid} from location ${location}, size: ${b.length}`);
        return new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response('Not found', { status: 404 });
    }
};
