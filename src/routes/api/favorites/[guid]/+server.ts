import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
// import { config } from '$config';
import { env } from '$env/dynamic/private'
import path from 'path';
import type { Favorite } from '$api';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const favoritesFilename = path.join(thumbsDir, 'favorites.json');

//PUT /api/favorites/<guid>
export const PUT: RequestHandler = async ({ params }) => {
    try {
        const guid = params.guid as string;

        // Read existing favorites file and append guid if not already present
        let favorites: Array<Favorite> = [];
        const exists = await fs.stat(favoritesFilename).then(() => true).catch(() => false);
        if (exists) {
            const favRaw = await fs.readFile(favoritesFilename, 'utf-8');
            favorites = JSON.parse(favRaw);
        }
        if (!favorites.find(fav => fav.guid === guid)) {
            favorites.push({ guid });
        }
        await fs.writeFile(favoritesFilename, JSON.stringify(favorites, null, 2), 'utf-8');
        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('Error saving favorites', err);
        return new Response('Error saving favorites', { status: 500 });
    }
}