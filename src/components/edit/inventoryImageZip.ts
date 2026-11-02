import JSZip from 'jszip';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);

/** A single image extracted from a ZIP, ready to upload. */
export interface ZipImage {
  /** Original filename inside the ZIP (without path). */
  filename: string;
  /** The base name without extension, used for matching (e.g. "INV-0042"). */
  matchKey: string;
  /** MIME content type. */
  contentType: string;
  /** The raw image data as a Blob. */
  blob: Blob;
}

function contentTypeFor(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

/** Extract image files from a ZIP and prepare them for matching. */
export async function extractImagesFromZip(file: File): Promise<ZipImage[]> {
  const zip = await JSZip.loadAsync(file);
  const images: ZipImage[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Get just the filename (ignore directory structure)
    const filename = path.split('/').pop() ?? path;

    // Skip hidden/system files
    if (filename.startsWith('.') || filename.startsWith('__')) continue;

    const dotIdx = filename.lastIndexOf('.');
    if (dotIdx < 0) continue;

    const ext = filename.substring(dotIdx + 1).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const matchKey = filename.substring(0, dotIdx);
    const blob = await entry.async('blob');

    images.push({
      filename,
      matchKey,
      contentType: contentTypeFor(ext),
      blob
    });
  }

  return images;
}

export interface ImageMatch {
  /** Index into the parsed rows array. */
  rowIndex: number;
  /** The ZIP image that matched. */
  image: ZipImage;
  /** How the match was made. */
  matchedBy: 'uniqueId' | 'name';
}

/**
 * Match extracted ZIP images to parsed inventory rows.
 *
 * Matching priority:
 * 1. Exact match on uniqueId (e.g. "INV-0042.jpg" → row with uniqueId "INV-0042")
 * 2. Exact match on name (case-insensitive)
 *
 * Each row gets at most one image (first match wins).
 * Returns matched pairs and a list of unmatched image filenames.
 */
export function matchImagesToRows(
  images: ZipImage[],
  rows: Array<{ uniqueId: string; name: string }>
): { matches: ImageMatch[]; unmatched: string[] } {
  const matches: ImageMatch[] = [];
  const matchedRowIndices = new Set<number>();
  const matchedImageIndices = new Set<number>();

  // Build lookup maps
  const byUniqueId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].uniqueId) byUniqueId.set(rows[i].uniqueId.trim().toLowerCase(), i);
    if (rows[i].name) byName.set(rows[i].name.trim().toLowerCase(), i);
  }

  // Pass 1: match by uniqueId
  for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
    const img = images[imgIdx];
    const rowIdx = byUniqueId.get(img.matchKey.trim().toLowerCase());
    if (rowIdx !== undefined && !matchedRowIndices.has(rowIdx)) {
      matches.push({ rowIndex: rowIdx, image: img, matchedBy: 'uniqueId' });
      matchedRowIndices.add(rowIdx);
      matchedImageIndices.add(imgIdx);
    }
  }

  // Pass 2: match by name (for images not yet matched)
  for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
    if (matchedImageIndices.has(imgIdx)) continue;
    const img = images[imgIdx];
    const rowIdx = byName.get(img.matchKey.trim().toLowerCase());
    if (rowIdx !== undefined && !matchedRowIndices.has(rowIdx)) {
      matches.push({ rowIndex: rowIdx, image: img, matchedBy: 'name' });
      matchedRowIndices.add(rowIdx);
      matchedImageIndices.add(imgIdx);
    }
  }

  const unmatched = images
    .filter((_, i) => !matchedImageIndices.has(i))
    .map((img) => img.filename);

  return { matches, unmatched };
}
