import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../../../../../../config';

export const GET: RequestHandler = async ({ params }) => {
    const guid = params.guid as string;
    const fileName = path.join(config.GENERATED_THUMBNAILS, guid + '.webp');
    const exists = await fs.stat(fileName).then(() => true).catch(() => false);
    if (!exists) return new Response('Not found', { status: 404 });
    const b = await fs.readFile(fileName);
    return new Response(new Uint8Array(b), { status: 200, headers: { 'Content-Type': 'image/webp' } });
};
