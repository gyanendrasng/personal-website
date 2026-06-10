'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogBlogTracker({ slug, title, category }) {
  useEffect(() => {
    posthog.capture('blog_post_opened', { slug, title, category });
  }, [slug, title, category]);

  return null;
}
