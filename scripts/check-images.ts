
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  title: string;
  description: string;
  categories: string[];
  date: string;
  photographer: string;
  photographerLink?: string;
}

interface ValidationResult {
  id: number;
  title: string;
  url: string;
  ok: boolean;
  error?: string;
}

const projectRoot = process.cwd();

const galleryData: GalleryImage[] = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, 'src/data/gallery.json'),
    'utf8'
  )
);

console.log(`\nChecking ${galleryData.length} image URLs...\n`);

async function checkImageUrl(
  imageData: GalleryImage
): Promise<ValidationResult> {
  const src = imageData.src;

  // Check local images, e.g. /images/covers/example.png
  if (src.startsWith('/')) {
    const localPath = path.join(
      projectRoot,
      'public',
      ...src.slice(1).split('/')
    );

    const exists = fs.existsSync(localPath);

    console.log(
      `${exists ? 'OK' : 'FAIL'} ID ${imageData.id}: ${imageData.title} - ${
        exists ? 'Local file exists' : 'Local file not found'
      }`
    );

    return {
      id: imageData.id,
      title: imageData.title,
      url: src,
      ok: exists,
      error: exists ? undefined : `Local file not found: ${localPath}`
    };
  }

  // Check external HTTP/HTTPS image URLs
  let url: URL;

  try {
    url = new URL(src);
  } catch {
    return {
      id: imageData.id,
      title: imageData.title,
      url: src,
      ok: false,
      error: 'Invalid image URL or local path'
    };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return {
      id: imageData.id,
      title: imageData.title,
      url: src,
      ok: false,
      error: `Unsupported protocol: ${url.protocol}`
    };
  }

  return new Promise((resolve) => {
    const client = url.protocol === 'https:' ? https : http;
    let settled = false;

    const finish = (result: ValidationResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = client.request(
      url,
      { method: 'HEAD' },
      (res) => {
        const status = res.statusCode || 0;
        const ok = status >= 200 && status < 300;

        console.log(
          `${ok ? 'OK' : 'FAIL'} ID ${imageData.id}: ${
            imageData.title
          } - ${status} ${res.statusMessage || 'Unknown'}`
        );

        finish({
          id: imageData.id,
          title: imageData.title,
          url: src,
          ok,
          error: ok ? undefined : `HTTP ${status}`
        });

        res.resume();
      }
    );

    req.on('error', (err: Error) => {
      console.log(
        `FAIL ID ${imageData.id}: ${imageData.title} - ${err.message}`
      );

      finish({
        id: imageData.id,
        title: imageData.title,
        url: src,
        ok: false,
        error: err.message
      });
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout'));
    });

    req.end();
  });
}

async function validateImages(): Promise<void> {
  try {
    const results = await Promise.all(
      galleryData.map(checkImageUrl)
    );

    const successful = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);

    console.log('\nSummary:');
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\nFailed images:');

      failed.forEach((image) => {
        console.log(`- ID ${image.id}: ${image.title}`);
        console.log(`  URL: ${image.url}`);

        if (image.error) {
          console.log(`  Error: ${image.error}`);
        }
      });
    }

    console.log('\nCheck complete!\n');

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Error during validation:', error);
    process.exitCode = 1;
  }
}

validateImages();

