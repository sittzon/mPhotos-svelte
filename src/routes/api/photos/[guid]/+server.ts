import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import { guidToLocation } from '../../../../helpers/filehelper';

export const GET: RequestHandler = async ({ params }) => {
    const guid = params.guid as string;
    const location = guidToLocation(guid);
    if (!location) return new Response('Not found', { status: 404 });
    try {
        const exists = await fs.stat(location).then(() => true).catch(() => false);
        if (!exists) return new Response('Not found', { status: 404 });
        const b = await fs.readFile(location);
        // console.log(`Serving photo ${guid} from location ${location}, size: ${b.length}`);
        return new Response(new Uint8Array(b), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    } catch {
        return new Response('Not found', { status: 404 });
    }
};
