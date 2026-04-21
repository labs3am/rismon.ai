import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardNavbar from '@/components/DashboardNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostRow {
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
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ---------- LIST VIEW ----------
function AdminBlogList() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    else setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Post deleted');
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[920px] mx-auto px-5 pt-24 pb-16">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Back to blog
        </Link>
        <div className="flex items-end justify-between mt-4">
          <div>
            <h1 className="text-foreground text-[28px] font-semibold">Blog admin</h1>
            <p className="text-muted-foreground text-sm mt-1">Create, edit and publish posts.</p>
          </div>
          <button
            onClick={() => navigate('/admin/blog/new')}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> New post
          </button>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <p className="text-foreground">No posts yet — click "New post".</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground font-medium truncate">{p.title || '(untitled)'}</h3>
                      {p.published ? (
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] uppercase tracking-wider font-semibold">
                          Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] uppercase tracking-wider font-semibold">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1 truncate">/blog/{p.slug}</p>
                  </div>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="text-muted-foreground hover:text-foreground p-2"
                    title="View"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    onClick={() => navigate(`/admin/blog/${p.id}`)}
                    className="border border-input text-foreground px-3 py-1.5 rounded-md text-sm hover:border-hover-border transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id, p.title)}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- EDITOR VIEW ----------
function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState('');
  const [author, setAuthor] = useState('Rismon Team');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        toast.error('Post not found');
        navigate('/admin/blog');
        return;
      }
      setTitle(data.title);
      setSlug(data.slug);
      setSlugTouched(true);
      setExcerpt(data.excerpt || '');
      setBody(data.body_markdown);
      setCover(data.cover_image_url || '');
      setAuthor(data.author_name);
      setMetaTitle(data.meta_title || '');
      setMetaDesc(data.meta_description || '');
      setPublished(data.published);
      setLoading(false);
    };
    load();
  }, [id, isNew, navigate]);

  // Auto-slug from title until user edits slug manually
  useEffect(() => {
    if (!slugTouched && isNew) setSlug(slugify(title));
  }, [title, slugTouched, isNew]);

  const save = async (publishNow?: boolean) => {
    if (!user) return;
    if (!title.trim()) return toast.error('Title is required');
    if (!slug.trim()) return toast.error('Slug is required');

    setSaving(true);
    const willPublish = publishNow ?? published;
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      body_markdown: body,
      cover_image_url: cover.trim() || null,
      author_name: author.trim() || 'Rismon Team',
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
      published: willPublish,
      published_at: willPublish ? (published ? undefined : new Date().toISOString()) : null,
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success(willPublish ? 'Published!' : 'Draft saved');
      navigate(`/admin/blog/${data.id}`);
    } else {
      const { error } = await supabase.from('blog_posts').update(payload).eq('id', id);
      setSaving(false);
      if (error) return toast.error(error.message);
      setPublished(willPublish);
      toast.success(willPublish ? 'Published!' : 'Saved');
    }
  };

  const inputCls = 'w-full bg-input-bg border border-input rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[920px] mx-auto px-5 pt-24 text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[920px] mx-auto px-5 pt-24 pb-16">
        <Link to="/admin/blog" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Back to admin
        </Link>

        <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
          <h1 className="text-foreground text-[24px] font-semibold">
            {isNew ? 'New post' : 'Edit post'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="border border-input text-foreground px-3 py-2 rounded-lg text-sm hover:border-hover-border transition-colors flex items-center gap-1.5"
            >
              <Eye size={14} /> {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="border border-input text-foreground px-3 py-2 rounded-lg text-sm hover:border-hover-border transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} /> Save draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {published ? 'Update live post' : 'Publish'}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="mt-8 bg-card border border-border rounded-2xl p-8">
            <h1 className="text-foreground text-[32px] font-semibold leading-tight">{title || '(untitled)'}</h1>
            {excerpt && <p className="text-muted-foreground text-[17px] mt-3">{excerpt}</p>}
            <div className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-black/40 prose-pre:border prose-pre:border-border max-w-none mt-6 text-[16px] leading-[1.7]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || '_Empty body_'}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="How to connect Supabase to Rismon" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-foreground text-sm font-medium block mb-1.5">URL slug</label>
                <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className={inputCls} placeholder="how-to-connect-supabase" />
                <p className="text-subtle text-[11px] mt-1">/blog/{slug || 'your-slug'}</p>
              </div>
              <div>
                <label className="text-foreground text-sm font-medium block mb-1.5">Author name</label>
                <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Excerpt (1–2 sentences shown on the blog list and meta description fallback)</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputCls + ' resize-y'} />
            </div>

            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Cover image URL (optional)</label>
              <input value={cover} onChange={(e) => setCover(e.target.value)} className={inputCls} placeholder="https://..." />
            </div>

            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Body (Markdown)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className={inputCls + ' font-mono text-[13px] resize-y leading-relaxed'}
                placeholder={'## Heading\n\nWrite your post in **markdown**. You can use:\n\n- Lists\n- `inline code`\n- [links](https://example.com)\n\n```\ncode blocks\n```'}
              />
              <p className="text-subtle text-[11px] mt-1">Supports GitHub-flavored markdown. Click Preview above to see how it renders.</p>
            </div>

            <details>
              <summary className="text-primary text-sm cursor-pointer hover:underline">SEO overrides (optional)</summary>
              <div className="mt-3 space-y-4 pl-3 border-l-2 border-border">
                <div>
                  <label className="text-foreground text-xs font-medium block mb-1.5">Meta title (defaults to post title)</label>
                  <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-foreground text-xs font-medium block mb-1.5">Meta description (defaults to excerpt)</label>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} className={inputCls + ' resize-y'} />
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- ENTRY ----------
export default function AdminBlog() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); setAdminChecking(false); return; }
    supabase.rpc('is_blog_admin').then(({ data }) => {
      setIsAdmin(data === true);
      setAdminChecking(false);
    });
  }, [user, loading]);

  if (loading || adminChecking) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-24 max-w-[920px] mx-auto px-5 text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-32 max-w-[480px] mx-auto px-5 text-center">
          <h1 className="text-foreground text-2xl font-semibold">Admins only</h1>
          <p className="text-muted-foreground mt-2">You need to be signed in as an admin to manage the blog.</p>
          <Link to="/blog" className="inline-block mt-6 text-primary hover:underline">← Back to blog</Link>
        </div>
      </div>
    );
  }

  return id ? <AdminBlogEditor /> : <AdminBlogList />;
}
