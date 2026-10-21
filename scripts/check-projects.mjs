
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const galleryPath = path.join(root, 'src/data/gallery.json');
const projectsPath = path.join(root, 'src/data/projects.json');
const publicDir = path.resolve(root, 'public');

const errors = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(
      `Cannot read ${path.relative(root, filePath)}: ${error.message}`
    );
    return null;
  }
}

// Keep this identical to src/content.config.ts.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function checkMediaPath(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label}: missing file path`);
    return;
  }

  // Remote media is not checked for availability by this script.
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    return;
  }

  if (!value.startsWith('/')) {
    errors.push(
      `${label}: local media paths must start with "/": ${value}`
    );
    return;
  }

  let relativePath = value.split(/[?#]/)[0].replace(/^\/+/, '');

  try {
    relativePath = decodeURIComponent(relativePath);
  } catch {
    errors.push(`${label}: invalid URL encoding: ${value}`);
    return;
  }

  const fullPath = path.resolve(publicDir, relativePath);

  // Prevent paths from escaping the public directory.
  if (
    fullPath === publicDir ||
    !fullPath.startsWith(publicDir + path.sep)
  ) {
    errors.push(`${label}: path must stay inside public/: ${value}`);
    return;
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    errors.push(
      `${label}: file not found: ${path.relative(root, fullPath)}`
    );
  }
}

const gallery = readJson(galleryPath);
const projects = readJson(projectsPath);

if (gallery !== null && !Array.isArray(gallery)) {
  errors.push('gallery.json must contain an array.');
}

if (projects !== null && !Array.isArray(projects)) {
  errors.push('projects.json must contain an array.');
}

if (Array.isArray(gallery) && Array.isArray(projects)) {
  const galleryIds = new Map();

  // Check gallery IDs using the Astro slug rule.
  gallery.forEach((item, index) => {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) {
      errors.push(`gallery.json item ${index + 1}: missing title.`);
      return;
    }

    const id = slugify(item.title);

    if (galleryIds.has(id)) {
      errors.push(
        `Duplicate gallery ID "${id}": "${galleryIds.get(id)}" and "${item.title}".`
      );
    } else {
      galleryIds.set(id, item.title);
    }
  });

  const projectIds = new Set();

  projects.forEach((project, index) => {
    const label = `projects.json item ${index + 1}`;

    if (!project || typeof project !== 'object') {
      errors.push(`${label}: must be an object.`);
      return;
    }

    if (typeof project.id !== 'string' || !project.id.trim()) {
      errors.push(`${label}: missing id.`);
      return;
    }

    if (projectIds.has(project.id)) {
      errors.push(`${label}: duplicate id "${project.id}".`);
    }
    projectIds.add(project.id);

    if (!galleryIds.has(project.id)) {
      errors.push(
        `${label} "${project.id}": no matching gallery title/slug found.`
      );
    }

    if (!Array.isArray(project.blocks)) {
      errors.push(`${label} "${project.id}": blocks must be an array.`);
      return;
    }

    project.blocks.forEach((block, blockIndex) => {
      const blockLabel =
        `${project.id}, block ${blockIndex + 1}` +
        ` (${block?.type ?? 'unknown type'})`;

      if (!block || typeof block !== 'object') {
        errors.push(`${blockLabel}: must be an object.`);
        return;
      }

      if (['image', 'gif', 'video'].includes(block.type)) {
        checkMediaPath(block.src, `${blockLabel}.src`);
      }

      if (block.type === 'video' && block.poster) {
        checkMediaPath(block.poster, `${blockLabel}.poster`);
      }

      if (block.type === 'gallery') {
        if (!Array.isArray(block.items) || block.items.length === 0) {
          errors.push(`${blockLabel}: items must contain at least one image.`);
          return;
        }

        block.items.forEach((item, itemIndex) => {
          checkMediaPath(
            item?.src,
            `${blockLabel}, gallery item ${itemIndex + 1}.src`
          );
        });
      }
    });
  });
}

console.log('\nProject data check\n');

if (errors.length > 0) {
  console.error(`Found ${errors.length} problem(s):\n`);
  errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error}`);
  });
  process.exitCode = 1;
} else {
  console.log('All project IDs and local media paths passed.');
  console.log('Remote media URLs were not checked.');
}
