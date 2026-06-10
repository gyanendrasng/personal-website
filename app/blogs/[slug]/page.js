import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug, formatDate } from '../../../lib/blog';
import '../blog.css';
import PostHogBlogTracker from './PostHogBlogTracker';

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    options: { parseFrontmatter: false },
  });

  return (
    <div className="blog-root">
      <PostHogBlogTracker
        slug={slug}
        title={post.frontmatter.title}
        category={post.frontmatter.category}
      />
      <div className="blog-wrap">
        <header className="blog-top">
          <a className="blog-brand" href="/">GYANENDRA SINGH</a>
          {post.frontmatter.game && (
            <a className="blog-play" href={post.frontmatter.game}>▶ {post.frontmatter.gameLabel || 'Play the game'}</a>
          )}
        </header>

        <article className="blog-article">
          <div className="post-meta">
            <b>{post.frontmatter.category}</b> · {formatDate(post.frontmatter.date)} · {post.readingTime}
          </div>
          <h1>{post.frontmatter.title}</h1>
          <p className="lede">{post.frontmatter.description}</p>
          {post.frontmatter.game && (
            <p>
              <a className="post-play" href={post.frontmatter.game}>▶ {post.frontmatter.gameLabel || 'Play the game'}</a>
            </p>
          )}
          {content}
        </article>

        <footer className="blog-footer">
          <a href="/blogs">← All posts</a>
          {post.frontmatter.game && (
            <a href={post.frontmatter.game}>▶ {post.frontmatter.gameLabel || 'Play the game'}</a>
          )}
        </footer>
      </div>
    </div>
  );
}
