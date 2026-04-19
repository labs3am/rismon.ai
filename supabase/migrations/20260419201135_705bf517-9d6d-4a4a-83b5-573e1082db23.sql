
-- Blog posts table for SEO content (e.g. "How to connect Supabase to Rismon")
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Rismon Team',
  meta_title TEXT,
  meta_description TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Stable admin check function (uses email from JWT claims to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_blog_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email IN ('risvan@labs3am.com', 'hello@rismon.ai')
  );
$$;

-- Anyone (anon + authenticated) can read PUBLISHED posts
CREATE POLICY "Anyone can view published posts"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (published = true);

-- Admins can see all posts (including drafts)
CREATE POLICY "Admins can view all posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (public.is_blog_admin());

CREATE POLICY "Admins can insert posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (public.is_blog_admin() AND created_by = auth.uid());

CREATE POLICY "Admins can update posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (public.is_blog_admin())
WITH CHECK (public.is_blog_admin());

CREATE POLICY "Admins can delete posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (public.is_blog_admin());

-- Auto-update updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
