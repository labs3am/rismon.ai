INSERT INTO public.blog_posts (
  slug, title, excerpt, body_markdown, author_name,
  meta_title, meta_description, published, published_at, created_by
) VALUES (
  'how-to-get-a-proper-report-from-rismon',
  'How to get a proper report from Rismon',
  'A step-by-step guide for non-technical founders. Connect your app, answer the intent questions clearly, and read your report like a pro — so every finding is accurate, useful, and fixable.',
  $md$## Why this guide exists

Rismon is only as accurate as the context you give it. We read your code line-by-line, but code alone does not tell us *what your app is supposed to do*. A login page is just a login page until you tell us "this is a paid product" or "only doctors should access patient records."

This guide walks you through the four things that decide whether your report is **truly useful** or just *technically correct*.

---

## 1. Connect the right repository

Your scan starts from your GitHub repo. Make sure you connect the repo that actually contains your live app, not an old fork or a side experiment.

- **One repo per app.** If your frontend and backend live in separate repos, scan them as two separate apps and link them in the description.
- **Use the production branch.** By default we scan `main`. If you ship from `production` or `release`, mention it in your app description so future Pro features can target it.
- **Read-only access.** We can never edit, delete, or push. You can revoke access from GitHub settings at any time.

> **Tip:** If your repo is private, double-check you granted Rismon access to *that specific repo*, not just your public ones.

---

## 2. Connect Supabase (optional, but powerful)

This step is **optional**, but it is the single biggest accuracy upgrade you can give us.

Without Supabase connected, we read your frontend and *guess* what your backend probably does. With Supabase connected, we read:

- **RLS policies on every table** — we tell you which tables are actually locked down and which are wide open.
- **Edge function code and secrets** — we verify your server-side logic matches your business rules.
- **Storage bucket rules** — we flag public buckets that should be private.

If your app handles payments, user data, or anything sensitive, **connect Supabase**. The findings move from "looks suspicious" to "verified, here is the exact policy."

---

## 3. Describe your app like you would explain it to a friend

After connecting, we ask you to describe what your app does. **This is the most important step.** Skip it or write one word, and your report will be generic. Spend two minutes here and your report becomes razor-sharp.

### What to write

- **What the app does.** "A booking system for hair salons where customers book slots and salons manage their calendar."
- **Who pays and for what.** "Customers book for free. Salons pay $29/month for unlimited bookings and SMS reminders."
- **Who should see what.** "Customers only see their own bookings. Salons only see bookings for their shop. No one sees other salons' data."
- **What you are most worried about.** "I am worried free salons can access paid SMS features without paying."

### What NOT to write

- ❌ "A SaaS app." (Too vague. We cannot check anything.)
- ❌ "An app built with React and Supabase." (We already see that.)
- ❌ "It does stuff for businesses." (Useless for verification.)

> **Rule of thumb:** If a stranger could read your description and explain your business model back to you, it is good enough.

---

## 4. Answer the smart questions honestly

After the first scan, Rismon asks you 3 to 5 **smart questions**. These are not random — they are pulled from things we found in your code that need confirmation.

Examples:

- *"We found a `is_premium` flag in your users table. Is this how you decide who can use paid features?"*
- *"We found an `/admin` route with no login check. Is this intentional or a bug?"*
- *"We see emails being sent from your edge function. Are these meant to go to all users or only verified ones?"*

**Answer all of them.** Skipping one means we mark related findings as "Unverified" instead of giving you a clear pass or fail. Three minutes of answers makes the difference between a vague report and a confident one.

---

## 5. Read your report the right way

Your report is structured into clear sections. Here is how to use each one.

### What works ✅
A short list of things your app does correctly. Read this first — it is morale fuel and confirms what is solid.

### Business problems 🟠
Things in your code that do not match your business model. Example: "Anyone can mark themselves as premium without paying." These are usually the most expensive bugs to ship, so fix them first.

### Security problems 🔴
API keys in code, missing login checks, unprotected database tables. Fix anything marked **Critical** today, **High** this week.

### Unknown features 🟣
Things your AI built that you never asked for. Sometimes harmless, sometimes a leftover demo route shipping to production. Review every one.

### Fix prompts 🔧
Every finding comes with a **copy-paste prompt**. Open Lovable, Cursor, or Bolt, paste the prompt, and the AI will fix the issue. You do not need to read the code yourself.

---

## 6. Re-scan after every fix

A scan is a snapshot. After you apply fixes, run a new scan to confirm the issue is gone. On the **Free plan** you get 3 scans per week, which is plenty for a small fix-verify-fix cycle.

If you ship daily, **Pro** runs a fresh scan on every commit and emails you when something breaks.

---

## TL;DR

1. Connect the right repo (production branch).
2. Connect Supabase if you can — it doubles accuracy.
3. Write a real, specific app description (2 minutes).
4. Answer every smart question honestly (3 minutes).
5. Fix Business + Critical Security findings first.
6. Re-scan after every fix.

That is it. Five minutes of context = a report you can actually act on.

> Ready to try? **[Run a free scan now →](/signup)**$md$,
  'Risvan',
  'How to get a proper report from Rismon — a founder''s guide',
  'Step-by-step guide for non-technical founders. Learn how to connect your app, answer intent questions, and read your Rismon report so every finding is accurate and fixable.',
  true,
  now(),
  '02f57b2c-dd4d-4acc-96f3-3417e08f738b'
);