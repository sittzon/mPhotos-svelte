import sharp from 'sharp';
import crypto from 'crypto';
import ExifParser from 'exif-parser';
import heicConvert from "heic-convert";

// Get image dimensions
export async function getImageDimensions(image: Buffer): Promise<[number, number]> {
    const img = sharp(image).rotate(); // Auto-rotate based on EXIF
    const meta = await img.metadata();
    // console.log('Image metadata:', meta);
    return [meta.width ?? 0, meta.height ?? 0];
}
// Get EXIF date
export async function getDateTaken(image: Buffer): Promise<string | null> {
    // console.log('Getting EXIF date');
    const parser = ExifParser.create(image);
    // console.log('Parser created');
    let result;
    let ts;
    try {
        result = parser.parse();
        ts = result.tags.DateTimeOriginal;
        // console.log('EXIF parsed');
    } catch (error) {
        // File probably heic, not jpeg, hopefully has xmp metadata
        const img = sharp(image)
        const meta = await img.metadata();
        const metaString = meta.xmpAsString;
        // Extract CreateDate from metaString
        //'<xmp:CreateDate>2023-04-11T10:34:30</xmp:CreateDate>\n'
        if (metaString) {
            const match = metaString.match(/\<xmp\:CreateDate\>(.*)\<\/xmp\:CreateDate\>/g);
            if (match && match.length > 0) {
                // TODO: Time seems to be off +1 or +2 hours. Check if timezone is included in metadata
                const dateStr = match[0].replace(/\<xmp\:CreateDate\>(.*)\<\/xmp\:CreateDate\>/, '$1');
                // console.log('Found CreateDate in XMP metadata:', dateStr);
                ts = new Date(dateStr).getTime() / 1000; // convert to seconds
            }
        }
    }
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