import path from 'path';
import fs from 'fs/promises';
import type { PhotoMeta } from './interfaces';
import { memoryCache } from './memorycache';

export const photosMetaCacheKey = 'photosMeta';

// Map GUID to original file location
export function guidToLocation(guid: string): string | null {
    const photos: PhotoMeta[] = memoryCache[photosMetaCacheKey] || [];
    // console.log(photos.find(x => x.guid === guid));
    return photos.find(x => x.guid === guid)?.location ?? null;
}

// Recursively get all jpg/jpeg files in the directory
export async function getFileInfosRecursively(root: string): Promise<Array<{ FullName: string; Name: string; Extension: string; Length: number }>> {
    const results: Array<{ FullName: string; Name: string; Extension: string; Length: number }> = [];
    console.log(`Scanning directory: ${root}`);
    async function walk(dir: string) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                await walk(fullPath);
            } else {
                const ext = path.extname(file.name).toLowerCase();
                if (ext === '.jpg' 
                    || ext === '.jpeg'
                    || ext === '.heic'
                    || ext === '.heif'
                    || ext === '.png'
                ) {
                    const stat = await fs.stat(fullPath);
                    results.push({
                        FullName: fullPath,
                        Name: file.name,
                        Extension: ext,
                        Length: stat.size
                    });
                }
            }
        }
    }
    await walk(root);
    return results;
}