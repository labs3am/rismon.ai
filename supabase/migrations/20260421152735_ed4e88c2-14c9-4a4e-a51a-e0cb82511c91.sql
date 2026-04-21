UPDATE public.blog_posts
SET title = $ti$How to get a proper report from Rismon$ti$,
    excerpt = $ex$Most founders scan once, get a generic report, and never come back. This guide fixes that in five minutes.$ex$,
    body_markdown = $blog$*Most founders scan once, get a generic report, and never come back. This guide fixes that in five minutes.*

## Why most reports feel useless

Rismon reads your code line by line. But code alone cannot tell us what your app is supposed to do. A login page is just a login page until you tell us this is a paid product or only verified users should reach this screen.

The founders who get sharp, actionable reports are the ones who spend five minutes giving us context. The ones who skip that step get a report that says things like "possible issue detected," which helps nobody.

This guide walks you through exactly what to do.

## Connect the right repository

Your scan starts from your GitHub repo. Connect the repo that contains your **live app**, not an old fork or a side project you abandoned.

If your frontend and backend live in separate repos, scan them as two separate apps and reference each other in the description. Rismon will read both and cross-reference.

By default Rismon scans your `main` branch. If you ship from a branch called `production` or `release`, mention that in your app description. We will flag it for future deep scans.

One thing founders miss: if your repo is private, make sure you granted Rismon access to **that specific repo** during GitHub connect. Granting access to your public repos only is the most common reason scans return empty results.

## Connect Supabase if you can

This step is optional. It is also the single biggest accuracy upgrade you can give your report.

Without Supabase connected, Rismon reads your frontend code and makes educated guesses about what your backend probably does. Those guesses are good. They are not perfect.

With Supabase connected, we read your **actual database rules**, your edge function code, and your storage policies. A finding that would say "looks like this table might be unprotected" becomes "confirmed, this table has no access rules and any signed-in user can read every row."

If your app handles payments, user accounts, or anything sensitive, connect Supabase. The difference in report quality is significant.

Firebase and custom API support is currently in beta. Supabase gives you the most verified findings today.

## Describe your app like a human

After connecting your repo, Rismon asks you to describe what your app does. **This is the most important step in the entire flow.**

Write it like you are explaining your business to a smart friend who has never heard of it. Cover four things.

- **What the app does.** "A booking system for hair salons where customers book appointments and salon owners manage their calendar."
- **Who pays and for what.** "Customers book for free. Salons pay monthly for unlimited bookings and automated reminders."
- **Who should see what.** "Customers only see their own bookings. Salons only see bookings for their location. Nobody sees another salon's data."
- **What you are most worried about.** "Free salons accessing paid features without paying is my biggest concern."

That last one is the most valuable thing you can write. When you tell Rismon your biggest worry, that becomes the first thing we check.

What not to write: "a SaaS app built with React" tells us nothing we cannot already see. "It does stuff for businesses" is not a description. If a stranger could read what you wrote and explain your business model back to you, it is good enough.

## Answer the questions honestly

After reading your code, Rismon asks you three to five questions. These are not generic. They come directly from things we found in your code that need confirmation before we can give you a clear verdict.

A typical question looks like this: "We found an `is_premium` flag in your users table. Is this how you decide who can use paid features?" Or this one: "We found an admin route with no login check. Is this intentional or a bug?"

Answer all of them. When you skip a question, Rismon marks the related finding as **unverified** instead of giving you a pass or fail. Three minutes of honest answers is the difference between a vague report and one you can act on immediately.

## Read the report in the right order

Your report has five sections. Read them in this order.

- **What your app does right** comes first. This confirms what is working and gives you a baseline. Most apps get several things right even when the score is low.
- **Business problems** come second. These are gaps between what you said your app should do and what the code actually does. A paywall that does not enforce payment. An admin area any user can reach. These are usually the most expensive bugs to ship to real users, so fix them before anything else.
- **Security problems** come third. Exposed API keys, missing login checks, unprotected database tables. Fix anything marked **Critical** before you show the app to anyone. Fix anything marked **High** before you launch publicly.
- **False promises** come fourth. These are things your homepage or README claims that we could not find evidence of in your code. If your landing page says "AI-powered recommendations" but there is no AI integration in the code, that appears here.

Every finding includes a **fix prompt**. Copy it, open Lovable or Cursor, paste it in, and the AI will fix the issue. You do not need to read or understand the code yourself. That is the point.

## Rescan after every fix

A scan is a snapshot of your app at one moment in time. After you apply fixes, run a new scan to confirm the issue is actually gone and nothing new broke.

On the free plan you get three scans per week. That is enough for a fix, verify, fix again cycle on most apps.

## The short version

Connect your production repo, not a test fork. Connect Supabase if your app handles real user data. Write a specific two-sentence description of who pays for what and who should see what. Answer every smart question. Fix business problems first, security second. Rescan after every change.

Five minutes of context turns a generic report into one you can act on today.
$blog$,
    meta_title = $mt$How to get a proper report from Rismon$mt$,
    meta_description = $md$A practical guide for non-technical founders on how to get accurate, useful results from Rismon. Covers repo setup, Supabase connection, writing a good app description, and reading your report correctly.$md$,
    updated_at = now()
WHERE slug = 'how-to-get-a-proper-report-from-rismon';