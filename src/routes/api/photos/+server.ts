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
const thumbnailSizeWidth = config.THUMBNAIL_SIZE || 300;
const mediumSizeWidth = config.MEDIUM_SIZE || 1200;
const videoExts = ['.mp4', '.mov'];
const imageExts = ['.jpg', '.jpeg', '.heic', '.heif', '.png'];

// Load photos
async function loadPhotos() {
    if (!memoryCache[photosMetaCacheKey]) {
        // First, get all original photo and video files
        let originalPhotos = await getFileInfosRecursively(config.ORIGINAL_PHOTOS);
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

                    // If video is less than 3 seconds, treat as live photo video
                    lengthSeconds = await getVideoDuration(fileInfo.FullName);
                    if (lengthSeconds < 3) {
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
                const thumbPath = path.join(config.GENERATED_THUMBNAILS, photoMeta.guid + '.webp');
                const thumbExists = await fs.stat(thumbPath).then(() => true).catch(() => false);
                if (!thumbExists) {
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
                const mediumPath = path.join(config.GENERATED_THUMBNAILS, photoMeta.guid + '-medium.webp');
                const mediumExists = await fs.stat(mediumPath).then(() => true).catch(() => false);
                if (!mediumExists) {
                    if (isVideo) {
                        await generateVideoThumbnail(fileInfo.FullName, mediumPath, mediumSizeWidth, Math.floor(photoMeta.height * (mediumSizeWidth / photoMeta.width)), 1);
                    } else {
                        await generateThumbnailBytes(bytes, mediumSizeWidth, Math.floor(photoMeta.height * (mediumSizeWidth / photoMeta.width)), mediumPath, 99, isHeic);
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
