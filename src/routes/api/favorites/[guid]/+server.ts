import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import { env } from '$env/dynamic/private'
import path from 'path';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const favoritesFilename = path.join(thumbsDir, 'favorites.json');

//PUT /api/favorites/<guid>
export const POST: RequestHandler = async ({ params }) => {
    try {
        const guid = params.guid as string;
        
        // Read existing favorites file and toggle guid
        let favorites: Array<string> = [];
        const fileExists = await fs.stat(favoritesFilename).then(() => true).catch(() => false);
        if (fileExists) {
            const favRaw = await fs.readFile(favoritesFilename, 'utf-8');
            favorites = JSON.parse(favRaw);
        }
        // Add favorite if not exists
        if (!favorites.find(fav => fav === guid)) {
            console.log("Adding favorite for GUID:", params.guid);
            favorites.push(guid);
        }
        // Remove favorite if exists
        else {
            console.log("Removing favorite for GUID:", params.guid);
            favorites = favorites.filter(fav => fav !== guid);
        }
        await fs.writeFile(favoritesFilename, JSON.stringify(favorites, null, 2), 'utf-8');
        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('Error saving favorites', err);
        return new Response('Error saving favorites', { status: 500 });
    }
}