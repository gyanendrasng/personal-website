import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { cache } from 'react';

const CONTENT_DIR = path.join(process.cwd(), 'content/blog');

export const getAllPosts = cache(() => {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  const posts = files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const { data, content } = matter(raw);
      if (!data.published) return null;
      return { slug, frontmatter: data, readingTime: readingTime(content).text };
    })
    .filter(Boolean);
  return posts.sort(
    (a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  );
});

export const getPostBySlug = cache((slug) => {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  if (!data.published) return null;
  return { slug, frontmatter: data, content, readingTime: readingTime(content).text };
});

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
