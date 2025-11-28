import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import { env } from '$env/dynamic/private'
import path from 'path';

const thumbsDir = env.GENERATED_THUMBNAILS || '/thumbs';
const trashFilename = path.join(thumbsDir, env.TRASH_FILE || 'trash.json');

// GET /api/trash
export const GET: RequestHandler = async ({ url }) => {
    try {
        const exists = await fs.stat(trashFilename).then(() => true).catch(() => false);
        // console.log("Trash file exists:", exists);
        if (!exists) return new Response('Not found', { status: 404 });
        const trashArray = await fs.readFile(trashFilename, 'utf-8').then(data => JSON.parse(data)) as Array<{ guid: string }>;
        return new Response(JSON.stringify(trashArray), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response('Not found', { status: 404 });
    }
};
