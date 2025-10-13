import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../../../../config';
import type { PhotoMeta, PhotoMetaClient } from '../../../../helpers/interfaces';
import { getImageDimensions, getDateTaken, getHashString, generateThumbnailBytes } from '../../../../helpers/imagehelper';
import { getFileInfosRecursively, photosMetaCacheKey } from '../../../../helpers/filehelper';
import { memoryCache } from '../../../../helpers/memorycache';


const metaDataFilename = path.join(config.GENERATED_THUMBNAILS, config.METADATA_FILE || 'metadata.json');
const errorLogFilename = path.join(config.GENERATED_THUMBNAILS, config.ERRORS_FILE || 'errors.log');
const thumbnailSizeWidth = config.THUMBNAIL_SIZE || 300;
const mediumSizeWidth = config.MEDIUM_SIZE || 1200;

// Load photos (async, simplified)
async function loadPhotos() {
    if (!memoryCache[photosMetaCacheKey]) {
        let originalPhotos = await getFileInfosRecursively(config.ORIGINAL_PHOTOS);
        originalPhotos = originalPhotos.filter(x => x.Extension.toLowerCase() === '.jpg' 
            || x.Extension.toLowerCase() === '.jpeg'
            || x.Extension.toLowerCase() === '.heic'
            || x.Extension.toLowerCase() === '.heif'
            || x.Extension.toLowerCase() === '.png'
        );

        let photoMetadata: PhotoMeta[] = [];
        try {
            const metaExists = await fs.stat(metaDataFilename).then(() => true).catch(() => false);
            if (metaExists) {
                const metaRaw = await fs.readFile(metaDataFilename, 'utf-8');
                photoMetadata = JSON.parse(metaRaw);
                const originalPhotosLocs = originalPhotos.map(x => x.FullName);
                const photoMetadataLocs = photoMetadata.map(x => x.location);
                const photosToIndex = originalPhotosLocs.filter(loc => !photoMetadataLocs.includes(loc));
                originalPhotos = originalPhotos.filter(x => photosToIndex.includes(x.FullName));
            }
        } catch {}

        let i = 0;
        for (const fileInfo of originalPhotos) {
            try {
                const bytes = await fs.readFile(fileInfo.FullName);
                console.log(`Processing photo: ${fileInfo.FullName}`);
                const [width, height] = await getImageDimensions(bytes);
                const dateTaken = await getDateTaken(bytes) as string;
                const photoMeta: PhotoMeta = {
                    dateTaken: dateTaken,
                    guid: getHashString(fileInfo.FullName),
                    location: fileInfo.FullName,
                    name: fileInfo.Name,
                    width: width,
                    height: height,
                    sizeKb: Math.floor(fileInfo.Length / 1024)
                };
                photoMetadata.push(photoMeta);
                photoMetadata.sort((a, b) => a.dateTaken.localeCompare(b.dateTaken));

                // Only generate thumbnail if not found on disk
                const isHeic = fileInfo.Extension.toLowerCase() === '.heic' || fileInfo.Extension.toLowerCase() === '.heif';
                const thumbPath = path.join(config.GENERATED_THUMBNAILS, photoMeta.guid + '.webp');
                const thumbExists = await fs.stat(thumbPath).then(() => true).catch(() => false);
                if (!thumbExists) {
                    const aspectRatio = photoMeta.width / photoMeta.height;
                    const w = thumbnailSizeWidth;
                    const h = Math.floor(photoMeta.height * (w / photoMeta.width));
                    await generateThumbnailBytes(bytes, w, h, thumbPath, 80, isHeic);
                }
                
                const mediumPath = path.join(config.GENERATED_THUMBNAILS, photoMeta.guid + '-medium.webp');
                const mediumExists = await fs.stat(mediumPath).then(() => true).catch(() => false);
                if (!mediumExists) {
                    await generateThumbnailBytes(bytes, mediumSizeWidth, Math.floor(photoMeta.height * (mediumSizeWidth / photoMeta.width)), mediumPath, 99, isHeic);
                }
                
                memoryCache[photosMetaCacheKey] = photoMetadata;
                i = (i + 1) % 50;
                if (i === 0) {
                    await fs.writeFile(metaDataFilename, JSON.stringify(photoMetadata));
                }
            } catch (e) {
                await fs.appendFile(errorLogFilename, `Error loading photo: ${fileInfo.FullName}. Exception: ${e}\n`);
            }
        }
        memoryCache[photosMetaCacheKey] = photoMetadata;
        await fs.writeFile(metaDataFilename, JSON.stringify(photoMetadata));
    }
}

// GET /api/photos/new/metadata
export const GET: RequestHandler = async ({ url }) => {
    await loadPhotos();
    const photos: PhotoMeta[] = memoryCache[photosMetaCacheKey] || [];
    const result: PhotoMetaClient[] = photos.map(x => ({
        dateTaken: x.dateTaken,
        guid: x.guid,
        name: x.name,
        sizeKb: x.sizeKb,
        width: x.width,
        height: x.height
    })).sort((a, b) => b.dateTaken.localeCompare(a.dateTaken));
    return new Response(JSON.stringify(result), { status: 200 });
};
