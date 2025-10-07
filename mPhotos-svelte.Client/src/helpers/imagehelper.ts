import sharp from 'sharp';
import crypto from 'crypto';
import ExifParser from 'exif-parser';

// Get image dimensions
export async function getImageDimensions(image: Buffer): Promise<[number, number]> {
    const img = sharp(image).rotate(); // Auto-rotate based on EXIF
    const meta = await img.metadata();
    return [meta.width ?? 0, meta.height ?? 0];
}
// Get EXIF date
export async function getDateTaken(image: Buffer): Promise<string | null> {
    const parser = ExifParser.create(image);
    const result = parser.parse();
    const ts = result.tags.DateTimeOriginal;
    if (typeof ts === 'number') {
        const date = new Date(ts * 1000); // convert seconds → milliseconds
        return date.toISOString();
    }
    return 'error-no-date-found';
}
// SHA-256 string to hash
export function getHashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
}
// Resize and save as webp
export async function generateThumbnailBytes(image: Buffer, w: number, h: number, outPath: string, quality = 80): Promise<void> {
    await sharp(image)
        .rotate() // Auto-rotate based on EXIF
        .resize(w, h, { fit: 'inside' })
        .webp({ quality })
        .toFile(outPath);
}