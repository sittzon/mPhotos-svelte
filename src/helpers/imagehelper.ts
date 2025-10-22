import sharp from 'sharp';
import crypto from 'crypto';
import heicConvert from "heic-convert";
// import fs from 'fs/promises';
import { ExifTool } from "exiftool-vendored";
import os from "os";

const cpuCount = os.cpus()?.length || 1;
// Tuning strategy: use at most CPUs or a fraction.
// If you expect many concurrent requests, increase; otherwise keep small to save memory.
const DEFAULT_MAX_PROCS = Math.max(1, Math.min(cpuCount, Number(process.env.EXIF_MAX_PROCS || cpuCount)));

// Create a single ExifTool manager. It will internally spawn up to `maxProcs` child exiftool processes.
const exiftool = new ExifTool({ maxProcs: DEFAULT_MAX_PROCS });

// Graceful shutdown: ensure child processes are closed when node exits.
// Use beforeExit/exit/SIGINT/SIGTERM to be safe in different environments.
export const shutdownExifTool = async () => {
  try {
    // `end()` is idempotent and returns a Promise that resolves when children are closed
    await exiftool.end();
    console.info("exiftool: ended");
  } catch (err) {
    console.error("exiftool: error during shutdown", err);
  }
};

process.once("beforeExit", shutdownExifTool);
process.once("SIGINT", async () => { await shutdownExifTool(); process.exit(0); });
process.once("SIGTERM", async () => { await shutdownExifTool(); process.exit(0); });

// Get image dimensions
export async function getImageDimensions(image: Buffer): Promise<[number, number]> {
    const img = sharp(image).rotate(); // Auto-rotate based on EXIF
    const meta = await img.metadata();
    // console.log('Image metadata:', meta);
    return [meta.width ?? 0, meta.height ?? 0];
}

export async function getDateTakenFromPath(imagePath: string): Promise<string | null> {
    // const exiftool = new ExifTool();
    try {
        const tags = await exiftool.read(imagePath);
        // example: "2218:09:22 02:32:14"
        const dt = tags.DateTimeOriginal;

        //Skip if no valid dateTimeOriginal found
        if (!dt) {
            console.log(`No DateTimeOriginal tag found for ${imagePath}`);
            return 'error-no-date-found';
        }

        let dateTaken = dt.rawValue;
        // Convert to format YYYY-MM-DD HH:MM:SS
        dateTaken = dateTaken.replace(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3 $4:$5:$6');

        // console.log(`Date taken from EXIF for ${imagePath}: ${dateTaken}`);
        return dateTaken;
    } catch (error) {
        console.log('Error reading EXIF data with ExifTool:', error, imagePath);
        return 'error-no-date-found';
    } 
    // finally {
        // Always clean up to prevent hanging processes
        // await exiftool.end();
    // }
}

// Get EXIF date
export async function getDateTaken(image: Buffer): Promise<string | null> {
    
    // First try EXIF parser
    // const parser = ExifParser.create(image);
    // let result;
    // let ts;
    // try {
    //     result = parser.parse();
    //     ts = result.tags.DateTimeOriginal;
    // } catch (error) {
    //     // File probably heic, not jpeg, hopefully has xmp metadata
    //     // Use sharp to extract xmp instead
    //     const img = sharp(image)
    //     const meta = await img.metadata();
    //     const metaString = meta.xmpAsString;
    //     // Extract CreateDate from metaString
    //     //'<xmp:CreateDate>2023-04-11T10:34:30</xmp:CreateDate>\n'
    //     if (metaString) {
    //         const match = metaString.match(/\<xmp\:CreateDate\>(.*)\<\/xmp\:CreateDate\>/g);
    //         if (match && match.length > 0) {
    //             // TODO: Time seems to be off +1 or +2 hours. Check if timezone is included in metadata
    //             const dateStr = match[0].replace(/\<xmp\:CreateDate\>(.*)\<\/xmp\:CreateDate\>/, '$1');
    //             ts = new Date(dateStr).getTime() / 1000; // convert to seconds
    //         } else {
    //             // console.log('No CreateDate found in XMP metadata, trying Apple-Fi Timestamp');
    //             // Try
    //             // <apple-fi:Timestamp>2439648783017</apple-fi:Timestamp>\n'
    //             const appleFiMatch = metaString.match(/\<apple-fi\:Timestamp\>(.*)\<\/apple-fi\:Timestamp\>/g);
    //             if (appleFiMatch && appleFiMatch.length > 0) {
    //                 ts = parseInt(appleFiMatch[0].replace(/\<apple-fi\:Timestamp\>(.*)\<\/apple-fi\:Timestamp\>/, '$1'), 10);
    //             } else {
    //                 // console.log('No Apple-Fi Timestamp found in XMP metadata');
    //                 // Try <photoshop:DateCreated>2019-09-25T20:33:29</photoshop:DateCreated>\n
    //                 const psMatch = metaString.match(/\<photoshop\:DateCreated\>(.*)\<\/photoshop\:DateCreated\>/g);
    //                 if (psMatch && psMatch.length > 0) {
    //                     const dateStr = psMatch[0].replace(/\<photoshop\:DateCreated\>(.*)\<\/photoshop\:DateCreated\>/, '$1');
    //                     ts = new Date(dateStr).getTime() / 1000; // convert to seconds
    //                 } else {
    //                     // console.log('No Photoshop DateCreated found in XMP metadata');

    //                     // Last resort: try to interpret possible filename pattern: 2020-12-12_114320.HEIC
    //                     const filenameMatch = metaString.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/g);
    //                     if (filenameMatch && filenameMatch.length > 0) {
    //                         const dateStr = filenameMatch[0];
    //                         ts = new Date(
    //                             parseInt(dateStr.substr(0, 4), 10),
    //                             parseInt(dateStr.substr(5, 2), 10) - 1,
    //                             parseInt(dateStr.substr(8, 2), 10),
    //                             parseInt(dateStr.substr(11, 2), 10),
    //                             parseInt(dateStr.substr(13, 2), 10),
    //                             parseInt(dateStr.substr(15, 2), 10)
    //                         ).getTime() / 1000; // convert to seconds
    //                     } else {
    //                         console.log('No date found at all!');
    //                         console.log('meta:', meta);
    //                     }

    //                 }
    //             }
    //         }
    //     }
    // }
    // if (typeof ts === 'number') {
    //     const date = new Date(ts * 1000); // convert seconds → milliseconds
    //     return date.toISOString();
    // }
    // // console.log('No date found in EXIF or XMP metadata');
    // return 'error-no-date-found';
}

// SHA-256 string to hash
export function getHashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
}

// Resize and save as webp
export async function generateThumbnailBytes(image: Buffer, w: number, h: number, outPath: string, quality = 80, isHeic: boolean = false): Promise<void> {

    let a: sharp.Sharp;
    if (isHeic) {
        const outputBuffer = await heicConvert({
            buffer: image,
            format: "JPEG",
        });
        a = await sharp(outputBuffer).rotate(); // Auto-rotate based on EXIF
    }
    else {
        a = await sharp(image)
            .rotate() // Auto-rotate based on EXIF
    }

    var b = a
        .resize(w, h, { fit: 'inside' })
        .webp({ quality })
    try {
        await b.toFile(outPath);
    } catch (e) {
        console.log('Error saving image:', e);
    }
}