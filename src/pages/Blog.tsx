import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

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
}

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Blog() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_blog_admin').then(({ data }) => setIsAdmin(data === true));
  }, [user]);

  useEffect(() => {
    document.title = 'Blog, Rismon | Verified AI App Audits';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Guides, deep dives, and best practices for shipping production-ready AI-built apps. Learn how to verify findings, fix Supabase setups, and harden your stack.');
  }, []);

  useEffect(() => {
    const load = async () => {
      // RLS handles drafts vs published. Admins see drafts, others only published.
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image_url, author_name, published, published_at, updated_at')
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
        title="Blog, Rismon | Verified AI App Audits"
        description="Guides and deep dives on shipping production-ready AI-built apps. Verify findings, fix Supabase setups, and harden your stack."
        canonicalPath="/blog"
      />
      <Navbar />

      <main className="max-w-[920px] mx-auto px-5 pt-32 pb-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-foreground text-[40px] sm:text-[48px] font-semibold tracking-tight leading-[1.1]">
              The Rismon Blog
            </h1>
            <p className="text-muted-foreground text-[17px] mt-3 max-w-[560px] leading-relaxed">
              Practical guides on shipping AI-built apps that actually work. Fewer guesses, more verified findings.
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

        <div className="mt-12">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <p className="text-foreground text-lg font-medium">No posts yet, but we're cooking something up.</p>
              <p className="text-muted-foreground text-sm mt-2">
                {isAdmin ? 'Use Manage posts to publish your first article.' : 'Stay tuned. First drop is on the way.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="block bg-card border border-border rounded-2xl p-6 hover:border-hover-border transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.author_name}</span>
                      <span>•</span>
                      <span>{formatDate(p.published_at || p.updated_at)}</span>
                      {!p.published && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] uppercase tracking-wider font-semibold">
                          Draft
                        </span>
                      )}
                    </div>
                    <h2 className="text-foreground text-[22px] font-semibold mt-2 group-hover:text-primary transition-colors leading-snug">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="text-muted-foreground text-[15px] mt-2 leading-relaxed line-clamp-2">
                        {p.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
