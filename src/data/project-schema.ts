
import { z } from 'astro:content';

const textBlock = z.object({
  type: z.literal('text'),
  heading: z.string().optional(),
  body: z.string(),
});

const imageBlock = z.object({
  type: z.literal('image'),
  src: z.string().min(1),
  alt: z.string(),
  caption: z.string().optional(),
});

const gifBlock = z.object({
  type: z.literal('gif'),
  src: z.string().min(1),
  alt: z.string(),
  caption: z.string().optional(),
});

const videoBlock = z.object({
  type: z.literal('video'),
  src: z.string().min(1),
  poster: z.string().optional(),
});

const galleryBlock = z.object({
  type: z.literal('gallery'),
  items: z.array(
    z.object({
      src: z.string().min(1),
      alt: z.string(),
      caption: z.string().optional(),
    })
  ).min(1),
});

const embedBlock = z.object({
  type: z.literal('embed'),
  src: z.string().url(),
  title: z.string(),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  subtitle: z.string().optional(),
  intro: z.string().optional(),
  blocks: z.array(
    z.discriminatedUnion('type', [
      textBlock,
      imageBlock,
      gifBlock,
      videoBlock,
      galleryBlock,
      embedBlock,
    ])
  ),
});

export const projectsSchema = z.array(projectSchema);

export type Project = z.infer<typeof projectSchema>;
