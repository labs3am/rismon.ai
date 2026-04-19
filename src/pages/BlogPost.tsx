import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ADMIN_EMAILS = ['risvan@labs3am.com', 'hello@rismon.ai'];

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  cover_image_url: string | null;
  author_name: string;
  meta_title: string | null;
  meta_description: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPost() {
  const { slug } = useParams();
  const { user } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data);
      setLoading(false);

      // SEO meta
      const title = data.meta_title || data.title;
      document.title = `${title} — Rismon Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', data.meta_description || data.excerpt || '');

      // Canonical
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = `${window.location.origin}/blog/${data.slug}`;

      // JSON-LD Article schema
      const existing = document.getElementById('blog-jsonld');
      if (existing) existing.remove();
      const ld = document.createElement('script');
      ld.id = 'blog-jsonld';
      ld.type = 'application/ld+json';
      ld.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: data.title,
        description: data.meta_description || data.excerpt,
        image: data.cover_image_url || undefined,
        datePublished: data.published_at,
        dateModified: data.updated_at,
        author: { '@type': 'Organization', name: data.author_name },
        publisher: { '@type': 'Organization', name: 'Rismon' },
      });
      document.head.appendChild(ld);
    };
    load();

    return () => {
      document.getElementById('blog-jsonld')?.remove();
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-[720px] mx-auto px-5 pt-32 pb-20 text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-[720px] mx-auto px-5 pt-32 pb-20 text-center">
          <h1 className="text-foreground text-2xl font-semibold">Post not found</h1>
          <p className="text-muted-foreground mt-2">This post may have been unpublished.</p>
          <Link to="/blog" className="inline-block mt-6 text-primary hover:underline">← Back to blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <article className="max-w-[720px] mx-auto px-5 pt-28 pb-20">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={14} /> Back to blog
        </Link>

        {!post.published && isAdmin && (
          <div className="mb-6 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-medium">
            Draft — only admins can see this page
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{post.author_name}</span>
          <span>•</span>
          <span>{formatDate(post.published_at || post.created_at)}</span>
        </div>

        <h1 className="text-foreground text-[36px] sm:text-[44px] font-semibold tracking-tight leading-[1.15] mt-3">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-muted-foreground text-[18px] mt-4 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="lazy"
            className="w-full rounded-xl border border-border mt-8"
          />
        )}

        <div className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/40 prose-pre:border prose-pre:border-border max-w-none mt-10 text-[16.5px] leading-[1.75]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body_markdown}
          </ReactMarkdown>
        </div>

        {isAdmin && (
          <div className="mt-12 pt-6 border-t border-border">
            <Link to={`/admin/blog/${post.id}`} className="text-primary text-sm hover:underline">
              Edit this post →
            </Link>
          </div>
        )}
      </article>

      <Footer />
    </div>
  );
}
