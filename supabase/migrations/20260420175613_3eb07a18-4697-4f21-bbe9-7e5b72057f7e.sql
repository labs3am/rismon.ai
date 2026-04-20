-- Seed two announcement blog posts. Use a fixed admin author UUID — the same approach as existing posts.
INSERT INTO public.blog_posts (slug, title, excerpt, body_markdown, author_name, created_by, published, published_at, meta_title, meta_description)
VALUES
(
  'claude-is-now-in-rismon',
  'Claude is now powering every Rismon scan, alongside Gemini',
  'We added Anthropic Claude as a second brain on every Deep Scan. Two models read your code. If they disagree, you see it. Fewer false positives, more verified findings.',
  E'## Why a second model\n\nUntil this week, every Rismon scan was read by a single AI model. That worked, but it had one weakness, when the model was wrong, nobody pushed back.\n\nStarting today, every Deep Scan is read by **two independent models**, Anthropic Claude and Google Gemini. They read your code separately. We only show you a finding when both agree it is real, or we mark it clearly as "needs your review" when they disagree.\n\n## What changes for you\n\n- **Fewer false alarms.** A finding only ships if both models see it.\n- **Clearer confidence labels.** Verified means both models agreed. Unverified means one model flagged it but the other was unsure.\n- **No price change.** Claude is included in Try Pro and Pro plans. Free scans still use a single model for speed.\n\n## Why Claude specifically\n\nClaude is unusually good at reading long files end-to-end and spotting logic that contradicts itself, exactly the kind of thing that sneaks past pattern-based scanners. Gemini is strong at structure and security patterns. Together they cover more ground than either alone.\n\n## What is next\n\nWe are testing GPT-5 as a third opinion for Pro Monthly. If it lands, you will see the option in your scan settings.\n\nThe goal is simple, give you a report you can act on without second-guessing.',
  'Risvan',
  '00000000-0000-0000-0000-000000000000',
  true,
  now(),
  'Claude is now in Rismon — two AI models verify every finding',
  'Anthropic Claude joins Google Gemini on every Rismon Deep Scan. Two models read your code, only verified findings ship.'
),
(
  'connect-your-supabase-for-deeper-accuracy',
  'Connect your Supabase and we read your real backend, not just your frontend',
  'You can now connect your Supabase project to Rismon. We read your real database rules, edge functions, and storage policies, instead of guessing from frontend code. Postgres, MySQL, and MongoDB support are next, currently in private beta.',
  E'## What this unlocks\n\nUntil now, Rismon scanned your **frontend** and inferred what your backend probably did. That is fast, but it leaves blind spots. We could not tell you for certain whether your `profiles` table was actually protected, only whether your code looked like it should be.\n\nConnect your Supabase project once and we read the real thing:\n\n- **RLS policies on every table.** We tell you exactly which tables are open to the public, which are user-scoped, and which have no policy at all.\n- **Edge function secrets.** We check whether keys are stored as secrets or accidentally bundled into the client.\n- **Storage bucket rules.** Public buckets, missing policies, oversized object size limits.\n- **Auth provider config.** Redirect URLs, OAuth scopes, password rules.\n\nFindings backed by real backend reads are marked **Verified** with a green dot. No more guessing.\n\n## How to connect\n\n1. Open your app in Rismon.\n2. Click **Connect Supabase**.\n3. Paste your project URL and your **anon key** (never the service role key, we never ask for it).\n\nWe use the anon key in read-only mode. We cannot create, update, or delete anything in your database.\n\n## Other databases\n\nWe support **Supabase only** at full release quality right now. Postgres, MySQL, and MongoDB connectors are in **private beta** and will be opened plan by plan over the coming weeks. If you want early access, mention it in support.\n\n## Why Supabase first\n\nMost AI-built apps we scan use Supabase. Building one connector well is better than three half-finished ones. Once Supabase is rock solid, we open the others.\n\nIf you already have a Rismon account, your next scan will offer the connect step automatically.',
  'Risvan',
  '00000000-0000-0000-0000-000000000000',
  true,
  now(),
  'Connect Supabase to Rismon for verified backend findings',
  'Connect your Supabase project to Rismon and we read your real RLS, edge functions, and storage rules. Postgres, MySQL, MongoDB in private beta.'
)
ON CONFLICT (slug) DO NOTHING;