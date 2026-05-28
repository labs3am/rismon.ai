import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

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

function readingTime(text: string | null | undefined) {
  const src = (text || '').trim();
  if (!src) return 1;
  const words = src.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  updated_at: string;
}

export default function BlogPost() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_blog_admin').then(({ data }) => setIsAdmin(data === true));
  }, [user]);
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

      // Related posts (other published, latest 2)
      const { data: rel } = await supabase
        .from('blog_posts')
        .select('id, slug, title, published_at, updated_at')
        .neq('id', data.id)
        .eq('published', true)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2);
      if (rel) setRelated(rel);

      // JSON-LD Article schema (title/description/canonical handled by <SEO />)
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

  const minutes = readingTime(post.body_markdown);
  const dot = <span style={{ color: '#333333' }}>·</span>;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${post.meta_title || post.title} — Rismon.ai`}
        description={post.meta_description || post.excerpt || `${post.title} — read on the Rismon blog.`}
        canonicalPath={`/blog/${post.slug}`}
        image={post.cover_image_url || undefined}
        noindex={!post.published}
        type="article"
      />
      <Navbar />

      <article
        className="rismon-article"
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <Link
          to="/blog"
          style={{
            fontSize: 13,
            color: '#555555',
            textDecoration: 'none',
            marginBottom: 48,
            display: 'inline-block',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
        >
          ← Back to blog
        </Link>

        {!post.published && isAdmin && (
          <div className="mb-6 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-medium">
            Draft — only admins can see this page
          </div>
        )}

        {/* Tag pill */}
        <div style={{ marginBottom: 20 }}>
          <span
            style={{
              display: 'inline-block',
              background: 'transparent',
              border: '1px solid #222222',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 11,
              color: '#555555',
              letterSpacing: '0.05em',
            }}
          >
            UPDATE
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {post.title}
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: '#555555' }}>{post.author_name}</span>
          {dot}
          <span style={{ fontSize: 13, color: '#444444' }}>
            {formatDate(post.published_at || post.created_at)}
          </span>
          {dot}
          <span style={{ fontSize: 13, color: '#444444' }}>{minutes} min read</span>
        </div>

        <div style={{ height: 1, background: '#1a1a1a', marginBottom: 48 }} />

        <div className="rismon-article-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body_markdown}
          </ReactMarkdown>
        </div>

        {/* CTA */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            marginTop: 64,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>
            Ready to scan your app?
          </div>
          <div style={{ fontSize: 14, color: '#555555', marginBottom: 24 }}>
            Free to start. No credit card.
          </div>
          <Link
            to="/signup"
            style={{
              background: '#ffffff',
              color: '#000000',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Start free scan →
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <h2
              style={{
                fontSize: 11,
                color: '#555555',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 24,
                fontWeight: 500,
                margin: '0 0 24px',
              }}
            >
              More from the blog
            </h2>
            <div className="rismon-related-grid">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/blog/${r.slug}`}
                  className="rismon-related-card"
                  style={{
                    background: 'transparent',
                    border: '1px solid #1a1a1a',
                    borderRadius: 8,
                    padding: 20,
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div
                    className="rismon-related-title"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#ffffff',
                      marginBottom: 8,
                      transition: 'color 0.15s',
                    }}
                  >
                    {r.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#444444' }}>
                    {formatDate(r.published_at || r.updated_at)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-12 pt-6" style={{ borderTop: '1px solid #1a1a1a' }}>
            <Link to={`/admin/blog/${post.id}`} style={{ color: '#f97316', fontSize: 14 }}>
              Edit this post →
            </Link>
          </div>
        )}

        <style>{`
          .rismon-related-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .rismon-related-card:hover .rismon-related-title { color: #f97316; }

          /* Markdown body styling */
          .rismon-article-body p {
            font-size: 16px;
            color: #888888;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .rismon-article-body h2 {
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: -0.01em;
            margin-top: 48px;
            margin-bottom: 16px;
          }
          .rismon-article-body h3 {
            font-size: 17px;
            font-weight: 600;
            color: #ffffff;
            margin-top: 32px;
            margin-bottom: 12px;
          }
          .rismon-article-body ul,
          .rismon-article-body ol {
            list-style: none;
            padding-left: 0;
            margin-bottom: 24px;
          }
          .rismon-article-body li {
            position: relative;
            color: #888888;
            font-size: 16px;
            line-height: 1.8;
            padding-left: 20px;
            margin-bottom: 8px;
          }
          .rismon-article-body li::before {
            content: "→";
            color: #f97316;
            position: absolute;
            left: 0;
            top: 0;
          }
          .rismon-article-body strong {
            color: #ffffff;
            font-weight: 600;
          }
          .rismon-article-body a {
            color: #f97316;
            text-decoration: none;
          }
          .rismon-article-body a:hover {
            text-decoration: underline;
          }
          .rismon-article-body blockquote {
            border-left: 2px solid #f97316;
            padding-left: 20px;
            color: #555555;
            font-style: italic;
            margin: 24px 0;
          }
          .rismon-article-body code {
            background: #0a0a0a;
            border: 1px solid #1a1a1a;
            color: #ffffff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
          }
          .rismon-article-body pre {
            background: #0a0a0a;
            border: 1px solid #1a1a1a;
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            margin-bottom: 24px;
          }
          .rismon-article-body pre code {
            background: transparent;
            border: none;
            padding: 0;
          }
          .rismon-article-body img {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #1a1a1a;
            margin: 24px 0;
          }

          @media (max-width: 767px) {
            .rismon-article {
              padding: 48px 20px !important;
            }
            .rismon-related-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </article>

      <Footer />
    </div>
  );
}
