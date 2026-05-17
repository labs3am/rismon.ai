import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';

interface PostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  body_markdown?: string | null;
}

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TAGS = ['GUIDE', 'UPDATE', 'FEATURE'] as const;
type Tag = typeof TAGS[number];
type Filter = 'ALL' | Tag;

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'All articles',
  GUIDE: 'Guides',
  UPDATE: "What's new",
  FEATURE: 'Features',
};

function readingTime(text: string | null | undefined, fallbackExcerpt: string | null) {
  const source = (text && text.length > 0 ? text : fallbackExcerpt || '').trim();
  if (!source) return 1;
  const words = source.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function Blog() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_blog_admin').then(({ data }) => setIsAdmin(data === true));
  }, [user]);

  // Title and meta description are handled by the <SEO /> component below
  // so every page gets a unique, indexable title in Google.

  useEffect(() => {
    const load = async () => {
      // RLS handles drafts vs published. Admins see drafts, others only published.
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image_url, author_name, published, published_at, updated_at, body_markdown')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });
      if (!error && data) setPosts(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Blog — Rismon.ai"
        description="Guides and deep dives on shipping production-ready AI-built apps. Verify findings, fix Supabase setups, and harden your stack."
        canonicalPath="/blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Rismon.ai Blog',
          url: 'https://rismon.ai/blog',
          blogPost: posts
            .filter((p) => p.published)
            .map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: `https://rismon.ai/blog/${p.slug}`,
              datePublished: p.published_at || p.updated_at,
              dateModified: p.updated_at,
              description: p.excerpt || undefined,
              author: { '@type': 'Person', name: p.author_name || 'Rismon Team' },
            })),
        }}
      />
      <Navbar />

      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#f97316',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              The Rismon Blog
            </div>
            <h1
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Practical guides for founders who ship with AI.
            </h1>
            <p
              style={{
                fontSize: 16,
                color: '#555555',
                marginTop: 12,
              }}
            >
              Fewer guesses. More verified findings.
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/admin/blog"
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Manage posts
            </Link>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1a1a1a', margin: '48px 0' }} />

        {/* Filter chips */}
        {!loading && posts.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 40,
            }}
            role="tablist"
            aria-label="Filter articles by type"
          >
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#000000' : '#888888',
                    border: active ? '1px solid #ffffff' : '1px solid #222222',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#333333';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = '#888888';
                      e.currentTarget.style.borderColor = '#222222';
                    }
                  }}
                >
                  {FILTER_LABELS[f]}
                </button>
              );
            })}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="blog-row"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #1a1a1a' }}
              >
                <div className="blog-row-grid">
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-14 rounded-full mt-3" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-11/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-10/12" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : posts.length === 0 ? (
          <div
            style={{
              fontSize: 15,
              color: '#555555',
              textAlign: 'center',
              padding: '80px 0',
            }}
          >
            No articles yet.<br />Check back soon.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(() => {
              const tagged = posts.map((p, idx) => ({ p, tag: TAGS[idx % TAGS.length] as Tag }));
              const visible = filter === 'ALL' ? tagged : tagged.filter((t) => t.tag === filter);
              if (visible.length === 0) {
                return (
                  <li style={{ color: '#555555', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                    No articles in this category yet.
                  </li>
                );
              }
              return visible.map(({ p, tag }, idx) => {
              const minutes = readingTime(p.body_markdown ?? null, p.excerpt);
              return (
                <li
                  key={p.id}
                  className="blog-row"
                  style={{
                    borderTop: idx === 0 ? 'none' : '1px solid #1a1a1a',
                  }}
                >
                  <div className="blog-row-grid">
                    {/* Left: metadata */}
                    <div>
                      <div style={{ fontSize: 13, color: '#555555', fontWeight: 500 }}>
                        {p.author_name}
                      </div>
                      <div style={{ fontSize: 13, color: '#444444', marginTop: 4 }}>
                        {formatDate(p.published_at || p.updated_at)}
                      </div>
                      <div style={{ fontSize: 12, color: '#333333', marginTop: 4 }}>
                        {minutes} min read
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: 'transparent',
                            border: '1px solid #222222',
                            borderRadius: 999,
                            padding: '3px 12px',
                            fontSize: 11,
                            color: '#555555',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {tag}
                        </span>
                        {!p.published && (
                          <span
                            style={{
                              marginLeft: 8,
                              padding: '3px 10px',
                              borderRadius: 999,
                              border: '1px solid hsl(var(--warning) / 0.3)',
                              color: 'hsl(var(--warning))',
                              fontSize: 10,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              fontWeight: 600,
                            }}
                          >
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: content */}
                    <div>
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blog-title-link"
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color: '#ffffff',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.3,
                          textDecoration: 'none',
                          display: 'inline-block',
                          transition: 'color 0.15s',
                        }}
                      >
                        {p.title}
                      </a>
                      {p.excerpt && (
                        <p
                          style={{
                            fontSize: 15,
                            color: '#555555',
                            lineHeight: 1.7,
                            marginTop: 10,
                            maxWidth: 600,
                          }}
                        >
                          {p.excerpt}
                        </p>
                      )}
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blog-read-more"
                        style={{
                          fontSize: 13,
                          color: '#444444',
                          marginTop: 16,
                          display: 'inline-block',
                          textDecoration: 'none',
                          transition: 'color 0.15s',
                        }}
                      >
                        Read article →
                      </a>
                    </div>
                  </div>
                </li>
              );
            });
            })()}
          </ul>
        )}

        <style>{`
          .blog-row { padding: 40px 0; }
          .blog-row-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 48px;
          }
          .blog-title-link:hover { color: #f97316 !important; }
          .blog-read-more:hover { color: #ffffff !important; }
          @media (max-width: 767px) {
            .blog-row { padding: 28px 0; }
            .blog-row-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
          }
        `}</style>
      </main>

      <Footer />
    </div>
  );
}
