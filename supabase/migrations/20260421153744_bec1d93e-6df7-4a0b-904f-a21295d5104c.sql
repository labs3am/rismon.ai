UPDATE public.blog_posts
SET title = $title$Claude is now powering every Rismon scan, alongside Gemini$title$,
    excerpt = $excerpt$We added Anthropic Claude as a second brain on every Deep Scan. Two models read your code independently. You see fewer false alarms and more findings you can actually trust.$excerpt$,
    body_markdown = $body$Until last week, every Rismon scan was powered by a single AI model. That worked well enough. But it had one fundamental weakness. When the model got something wrong, nothing pushed back. A hallucinated finding looked exactly the same as a real one.

That changes today.

Every Deep Scan now runs through two independent models. Anthropic Claude reads your code first, looking for gaps between what you said your app should do and what the code actually does. Google Gemini then reviews every finding Claude surfaced, independently, without seeing Claude's reasoning.

We only show you a finding when both models agree it is real. When they disagree, you see the finding clearly marked as unverified so you can make the call yourself.

## Why Claude specifically

We evaluated several models before adding a second one to the pipeline. Claude stood out for one reason that matters specifically for what Rismon does.

Claude is unusually good at reading long files from start to finish and noticing when logic in one part of the code contradicts logic in another part. A paywall check that exists on one route but is missing on three others. A permission flag that is set correctly in the auth flow but ignored in the API layer. These are exactly the kinds of gaps that pattern-based scanners miss because they look at code in isolation rather than as a system.

Gemini is strong at structure, consistency, and security patterns. Claude is strong at intent and logic. Together they catch more than either does alone.

## What changes in your report

Findings now carry a confidence label. **Verified** means both models independently confirmed the issue exists. **Unverified** means one model flagged it but the other could not confirm it from the code available.

Your score reflects this. Verified findings carry full weight in the calculation. Unverified findings carry half weight. An app with three verified critical issues will score significantly lower than one where the same issues are unverified, because the evidence is stronger.

Free scans use a single model for speed. Deep Scans, available on Try Pro and Pro plans, run both models on your full codebase.

## A note on accuracy

Two models agreeing does not mean they are always right. It means the evidence threshold is higher before something appears in your report. You will see fewer findings overall on a typical app compared to before this change. The findings you do see will be harder to dismiss.

If you believe a finding is wrong, use the **report wrong** button on any finding card. We log every dispute and use them to improve the verification prompts over time.

## What is next

The next accuracy improvement we are working on is direct Supabase verification. When you connect your Supabase project, Rismon reads your actual database policies instead of inferring them from frontend code. That removes the largest remaining source of false positives in the current scanner.

Supabase integration is live now. Firebase and custom API support is in beta. If you have not connected your backend yet, the [connect](/connect) screen walks you through it in under two minutes.$body$,
    meta_description = $meta$Rismon now uses two independent AI models on every Deep Scan. Claude reads your code for logic gaps. Gemini verifies the findings. You only see what both agree on.$meta$,
    updated_at = now()
WHERE slug = 'claude-is-now-in-rismon';