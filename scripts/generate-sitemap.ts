/**
 * Build-time sitemap generator.
 *
 * Fetches all published blog posts from Supabase and writes a complete
 * sitemap.xml to public/sitemap.xml so it is served as a static file at
 * https://rismon.ai/sitemap.xml.
 *
 * Runs automatically before every Vite build (see vite.config.ts).
 * If Supabase is unreachable, the existing public/sitemap.xml is left
 * untouched so the build never fails.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE = 'https://rismon.ai';

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', changefreq: 'weekly', priority: '0.9' },
  { path: '/sample-report', changefreq: 'monthly', priority: '0.8' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { path: '/promise-audit', changefreq: 'weekly', priority: '1.0' },
  { path: '/how-we-score', changefreq: 'monthly', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/security', changefreq: 'monthly', priority: '0.7' },
  { path: '/open-source', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/for/lovable', changefreq: 'monthly', priority: '0.7' },
  { path: '/for/bolt', changefreq: 'monthly', priority: '0.7' },
  { path: '/for/cursor', changefreq: 'monthly', priority: '0.7' },
  { path: '/status', changefreq: 'daily', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/signup', changefreq: 'yearly', priority: '0.3' },
  { path: '/login', changefreq: 'yearly', priority: '0.3' },
  { path: '/reset-password', changefreq: 'yearly', priority: '0.2' },
];

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

export async function generateSitemap(): Promise<void> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const today = fmt(new Date());
  let posts: { slug: string; published_at: string | null; updated_at: string }[] = [];
  let audits: { id: string; created_at: string }[] = [];

  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/blog_posts?select=slug,published_at,updated_at&published=eq.true&order=published_at.desc.nullslast`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      if (res.ok) posts = (await res.json()) as typeof posts;
      else console.warn(`[sitemap] Supabase fetch failed: ${res.status}`);
    } catch (e) {
      console.warn(`[sitemap] Supabase fetch error: ${(e as Error).message}`);
    }
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/public_audits?select=id,created_at&order=created_at.desc&limit=1000`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      if (res.ok) audits = (await res.json()) as typeof audits;
      else console.warn(`[sitemap] Supabase audits fetch failed: ${res.status}`);
    } catch (e) {
      console.warn(`[sitemap] Supabase audits fetch error: ${(e as Error).message}`);
    }
  } else {
    console.warn('[sitemap] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — emitting static-only sitemap.');
  }

  const urls: string[] = [];
  for (const r of STATIC_ROUTES) {
    urls.push(
      `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
    );
  }
  for (const p of posts) {
    const lastmod = fmt(new Date(p.updated_at || p.published_at || Date.now()));
    urls.push(
      `  <url>\n    <loc>${SITE}/blog/${esc(p.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    );
  }
  for (const a of audits) {
    const lastmod = fmt(new Date(a.created_at || Date.now()));
    urls.push(
      `  <url>\n    <loc>${SITE}/promise-audit/${esc(a.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  writeFileSync(resolve(process.cwd(), 'public/sitemap.xml'), xml, 'utf8');
  console.log(`[sitemap] Wrote public/sitemap.xml (${STATIC_ROUTES.length} static + ${posts.length} blog posts + ${audits.length} audits)`);
}
