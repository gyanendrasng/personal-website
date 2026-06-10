import { getAllPosts, formatDate } from '../../lib/blog';
import './blog.css';

export const metadata = {
  title: 'Blog',
  description: 'Build logs and notes from things I make — projects, experiments, and the problems hit along the way.',
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <div className="blog-root">
      <div className="blog-wrap">
        <header className="blog-top">
          <a className="blog-brand" href="/">GYANENDRA SINGH</a>
        </header>

        <section className="blog-hero">
          <div className="blog-kicker">Blog</div>
          <h1>Writing</h1>
          <p>Build logs and notes from things I make — what was built, what broke, and how it got fixed.</p>
        </section>

        {posts.map((p) => (
          <a key={p.slug} className="post-card post-card-link" href={`/blogs/${p.slug}`}>
            <h2>{p.frontmatter.title}</h2>
            <p>{p.frontmatter.description}</p>
            <div className="post-meta">
              <b>{p.frontmatter.category}</b> · {formatDate(p.frontmatter.date)} · {p.readingTime}
            </div>
          </a>
        ))}

        <footer className="blog-footer">
          <span>© 2026 Gyanendra Singh</span>
          <a href="/">Home</a>
        </footer>
      </div>
    </div>
  );
}
