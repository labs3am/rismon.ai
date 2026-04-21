import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description: string;
  /** Path-only canonical (e.g. "/login"). Defaults to current pathname. */
  canonicalPath?: string;
  /** Absolute image URL for OG/Twitter cards. */
  image?: string;
  /** Set to true for auth/admin/utility pages we don't want indexed. */
  noindex?: boolean;
  /** JSON-LD structured data object to inject as <script type="application/ld+json"> */
  jsonLd?: Record<string, unknown>;
}

const SITE_ORIGIN = 'https://rismon.ai';
const DEFAULT_IMAGE =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/RZIVAW4UsWbsD0XShgG2dfG87vP2/social-images/social-1776626496817-Screenshot_2026-04-18_230826.webp';

const upsertMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

/**
 * Per-page SEO updater. Keeps title, description, canonical and social cards
 * in sync with the current route so Google shows the right snippet for each link.
 */
export default function SEO({ title, description, canonicalPath, image, noindex }: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    const trimmedTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;
    const trimmedDesc = description.length > 160 ? description.slice(0, 157) + '…' : description;
    const path = canonicalPath ?? location.pathname;
    const canonicalUrl = SITE_ORIGIN + (path === '/' ? '/' : path.replace(/\/$/, ''));
    const img = image || DEFAULT_IMAGE;

    document.title = trimmedTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', trimmedDesc);
    upsertMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertLink('canonical', canonicalUrl);

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', trimmedTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', trimmedDesc);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', img);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', trimmedTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', trimmedDesc);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img);
  }, [title, description, canonicalPath, image, noindex, location.pathname]);

  return null;
}
