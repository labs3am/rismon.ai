UPDATE public.blog_posts
SET title = $title$Connect your Supabase and we read your real backend, not just your frontend$title$,
    excerpt = $excerpt$You can now connect your Supabase project to Rismon. Instead of inferring what your backend probably does, we read it directly. Every finding backed by real backend data is marked Verified.$excerpt$,
    body_markdown = $body$Until now, Rismon scanned your frontend code and made educated inferences about what your backend probably did. That approach catches a lot. It also has a real limitation.

When we told you a database table looked unprotected, we were reading your frontend queries and guessing. We could not see your actual database rules. A founder who had set everything up correctly would see an unverified warning and have no way to prove us wrong short of explaining their entire database configuration in the description field.

That gap is now closed for Supabase users.

## What we read when you connect

Once you connect your Supabase project, Rismon reads four things directly.

**Your row level security policies on every table.** We tell you exactly which tables are open to the public, which only return rows owned by the current user, and which have no policy at all. No more guessing from frontend query patterns.

**Your edge function code.** We check whether sensitive operations are happening server-side where they belong, and whether keys are stored as environment secrets or accidentally exposed in function code.

**Your storage bucket rules.** Public buckets that should be private, missing size limits, policies that allow unauthenticated uploads. These show up as verified findings with the exact bucket name.

**Your auth configuration.** Redirect URLs that could be abused, OAuth scopes wider than necessary, password strength settings.

Every finding that comes from a direct backend read is marked **Verified** in your report. Findings we still have to infer from frontend code are marked **Unverified**. The distinction is now clear every time.

## How to connect

Open your app in Rismon and go to the connect step. You will see a field for your Supabase project URL and your anon public key.

Use your anon key only. Never your service role key. We do not ask for it and we never will. The anon key gives us read access to the same data your frontend can see, plus the ability to call your database functions with the same permissions a logged-out visitor would have. That is enough to verify your policies without us touching anything we should not.

We cannot create, update, or delete anything in your database. The connection is read-only by design.

If you are not sure where to find your anon key, it is in your Supabase dashboard under Project Settings then API. It starts with `eyJ` and is safe to use in frontend code, which is exactly why it is safe to give to Rismon.

## Why Supabase first

The majority of AI-built apps we scan use Supabase. Building one integration properly is worth more than three half-finished ones. We wanted founders to be able to trust the verified label before we put it on findings, which meant making sure the Supabase connection was solid before opening anything else.

Firebase and custom API connectors are in beta now. They work, but the coverage is narrower and some finding types are still unverified even with a connection. We will open them fully once the coverage matches what Supabase delivers today.

If you want early access to Firebase or custom API verification, reach out through the [contact page](/contact) and we will add you to the list.

## One thing worth knowing

Connecting Supabase does not change your score retroactively. Your next scan will use the real backend data and the score will reflect that. Some findings that were unverified before will become verified. Some warnings that appeared because we were guessing will disappear entirely because we can now confirm the protection is real.

If your score goes up after connecting, that means we were being cautious before and your setup is actually solid. If it goes down, we found something real that the frontend scan missed.

Either way, you will know the truth about your app instead of our best guess.$body$,
    meta_description = $meta$Rismon can now connect directly to your Supabase project and read your actual database rules, edge functions, and storage policies. Findings backed by real data are marked Verified.$meta$,
    updated_at = now()
WHERE slug = 'connect-your-supabase-for-deeper-accuracy';