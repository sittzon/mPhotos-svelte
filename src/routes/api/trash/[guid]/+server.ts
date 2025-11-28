import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import { env } from '$env/dynamic/private'
import path from 'path';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const trashFilename = path.join(thumbsDir, 'trash.json');

//PUT /api/trash/<guid>
export const POST: RequestHandler = async ({ params }) => {
    try {
        const guid = params.guid as string;
        
        // Read existing trash file and toggle guid
        let trash: Array<string> = [];
        const fileExists = await fs.stat(trashFilename).then(() => true).catch(() => false);
        if (fileExists) {
            const trashRaw = await fs.readFile(trashFilename, 'utf-8');
            trash = JSON.parse(trashRaw);
        }
        // Add trash item if not exists
        if (!trash.find(trashItem => trashItem === guid)) {
            console.log("Adding to trash for GUID:", params.guid);
            trash.push(guid);
        }
        // Remove trash item if exists
        else {
            console.log("Removing from trash for GUID:", params.guid);
            trash = trash.filter(trashItem => trashItem !== guid);
        }
        await fs.writeFile(trashFilename, JSON.stringify(trash, null, 2), 'utf-8');
        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('Error saving trash file', err);
        return new Response('Error saving trash file', { status: 500 });
    }
}