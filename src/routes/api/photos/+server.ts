import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { config } from '$config';
import type { PhotoMeta, PhotoMetaClient } from '$helpers/interfaces';
import { getImageDimensions, getVideoDimensions, getVideoDuration, generateVideoThumbnail, shutdownExifTool, getHashString, generateThumbnailBytes, getDateTakenFromPath } from '$helpers/imagehelper';
import { getFileInfosRecursively, photosMetaCacheKey } from '$helpers/filehelper';
import { memoryCache } from '$helpers/memorycache';

const metaDataFilename = path.join(config.GENERATED_THUMBNAILS, config.METADATA_FILE || 'metadata.json');
const errorLogFilename = path.join(config.GENERATED_THUMBNAILS, config.ERRORS_FILE || 'errors.log');
const originalsDir = config.ORIGINAL_PHOTOS || '/originals';
const thumbsDir = config.GENERATED_THUMBNAILS || '/thumbs';
const thumbnailSizeWidth = config.THUMBNAIL_SIZE || 300;
const mediumSizeWidth = config.MEDIUM_SIZE || 1200;
const videoExts = ['.mp4', '.mov'];
const imageExts = ['.jpg', '.jpeg', '.heic', '.heif', '.png'];

// Load photos
async function loadPhotos() {
    if (!memoryCache[photosMetaCacheKey]) {
        // Check if originalsDir directory exists
        try {
            await fs.stat(originalsDir);
        } catch {
            console.error('Original photos directory does not exist');
            return;
        }

        // Create thumbs dir if not exists
        try {
            await fs.stat(thumbsDir);
        } catch {
            await fs.mkdir(thumbsDir, { recursive: true });
        }

        // First, get all original photo and video files
        let originalPhotos = await getFileInfosRecursively(originalsDir);
        originalPhotos = originalPhotos.filter(x => 
            imageExts.includes(x.Extension.toLowerCase())
            || videoExts.includes(x.Extension.toLowerCase())
        );

        let photoMetadata: PhotoMeta[] = [];
        try {
            // Check if metadata file exists and only index new photos not found in metadata file
            const metaExists = await fs.stat(metaDataFilename).then(() => true).catch(() => false);
            if (metaExists) {
                // If exists, load existing metadata
                const metaRaw = await fs.readFile(metaDataFilename, 'utf-8');
                photoMetadata = JSON.parse(metaRaw);
                const originalPhotosLocs = originalPhotos.map(x => x.FullName);
                const photoMetadataLocs = photoMetadata.map(x => x.location);
                // Only index new photos that are not already in metadata file
                const photosToIndex = originalPhotosLocs.filter(loc => !photoMetadataLocs.includes(loc));
                // Filter originalPhotos to only those that need to be indexed
                originalPhotos = originalPhotos.filter(x => photosToIndex.includes(x.FullName));
            }
        } catch {}

        let i = 0;
        // originalPhotos now only contains new photos to index
        for (const fileInfo of originalPhotos) {
            try {
                // If video, then use getVideoDimensions
                let bytes: Buffer;
                let width: number = 0;
                let height: number = 0;
                let dateTaken: string = 'unknown';
                let type: 'photo' | 'video' | 'live-photo-video' = 'photo';
                let lengthSeconds: number | null = null;
                let isVideo = videoExts.includes(fileInfo.Extension.toLowerCase());
                if (isVideo) {
                    [width, height] = await getVideoDimensions(fileInfo.FullName);
                    dateTaken = await getDateTakenFromPath(fileInfo.FullName) as string;

                    // If video is less than 4 seconds, treat as live photo sidecar video
                    lengthSeconds = await getVideoDuration(fileInfo.FullName);
                    if (lengthSeconds < 4) {
                        type = 'live-photo-video';
                    } else {
                        type = 'video';
                    }
                } else {
                    bytes = await fs.readFile(fileInfo.FullName);
                    [width, height] = await getImageDimensions(bytes);
                    dateTaken = await getDateTakenFromPath(fileInfo.FullName) as string;
                }
                // const dateTaken = await getDateTaken(bytes) as string;
                const photoMeta: PhotoMeta = {
                    dateTaken: dateTaken,
                    guid: getHashString(fileInfo.FullName),
                    location: fileInfo.FullName,
                    name: fileInfo.Name,
                    type: type,
                    width: width,
                    height: height,
                    lengthSeconds: lengthSeconds,
                    sizeKb: Math.floor(fileInfo.Length / 1024)
                };
                photoMetadata.push(photoMeta);
                photoMetadata.sort((a, b) => a.dateTaken.localeCompare(b.dateTaken));

                // Only generate thumbnail if not found on disk
                const isHeic = fileInfo.Extension.toLowerCase() === '.heic' || fileInfo.Extension.toLowerCase() === '.heif';
                const thumbPath = path.join(thumbsDir, photoMeta.guid + '.webp');
                const thumbFileExists = await fs.stat(thumbPath).then(() => true).catch(() => false);
                if (!thumbFileExists) {
                    const aspectRatio = photoMeta.width / photoMeta.height;
                    const w = thumbnailSizeWidth;
                    const h = Math.floor(photoMeta.height * (w / photoMeta.width));
                    if (isVideo) {
                        await generateVideoThumbnail(fileInfo.FullName, thumbPath, w, h);
                    } else {
                        await generateThumbnailBytes(bytes, w, h, thumbPath, 80, isHeic);
                    }
                }
                
                // Do same for medium size
                const mediumPath = path.join(thumbsDir, photoMeta.guid + '-medium.webp');
                const mediumFileExists = await fs.stat(mediumPath).then(() => true).catch(() => false);
                const mediumSizeWidthMin = Math.min(photoMeta.width, mediumSizeWidth); // Don't upscale beyond original width
                const mediumSizeHeight = Math.floor(photoMeta.height * (mediumSizeWidthMin / photoMeta.width));
                if (!mediumFileExists) {
                    if (isVideo) {
                        await generateVideoThumbnail(fileInfo.FullName, mediumPath, mediumSizeWidthMin, mediumSizeHeight, 1);
                    } else {
                        await generateThumbnailBytes(bytes, mediumSizeWidthMin, mediumSizeHeight, mediumPath, 99, isHeic);
                    }
                }
                
                // Update in-memory cache
                memoryCache[photosMetaCacheKey] = photoMetadata;

                // Only write to file every 50th photo to reduce disk writes
                i = (i + 1) % 50;
                if (i === 0) {
                    await fs.writeFile(metaDataFilename, JSON.stringify(photoMetadata));
                }
            } catch (e) {
                const now = new Date().toISOString();
                await fs.appendFile(errorLogFilename, `[${now}] Error loading photo: ${fileInfo.FullName}. Exception: ${e}\n`);
            }
        }
        shutdownExifTool(); // Runs exiftool.end() to close child processes.
        memoryCache[photosMetaCacheKey] = photoMetadata;
        await fs.writeFile(metaDataFilename, JSON.stringify(photoMetadata));
    }
}

// GET /api/photos/metadata
export const GET: RequestHandler = async ({ url }) => {
    await loadPhotos();
    const photos: PhotoMeta[] = memoryCache[photosMetaCacheKey] || [];
    const result: PhotoMetaClient[] = photos.map(x => ({
        dateTaken: x.dateTaken,
        guid: x.guid,
        name: x.name,
        type: x.type,
        sizeKb: x.sizeKb,
        width: x.width,
        height: x.height,
        lengthSeconds: x.lengthSeconds
    }))
    .sort((a, b) => {
        // Push any "error-no-date-found" entries to the end
        if (a.dateTaken === 'error-no-date-found' && b.dateTaken !== 'error-no-date-found') return 1;
        if (b.dateTaken === 'error-no-date-found' && a.dateTaken !== 'error-no-date-found') return -1;

        // Otherwise, normal descending sort by dateTaken
        return b.dateTaken.localeCompare(a.dateTaken);
    });
    return new Response(JSON.stringify(result), { status: 200 });
};
