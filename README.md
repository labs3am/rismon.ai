# Rismon.ai
AI agent that reads your AI-built app
and tells you in plain English what 
was built, what works, and what needs fixing.

Built for non-technical founders who 
build with Lovable, Bolt, Cursor, 
Emergent, and other AI tools.

## Why We Are Open Source

We handle your GitHub code during analysis.
We want you to verify exactly what happens.
Read every line. Trust nothing blindly.

## What Happens To Your Code

1. You authorize read only GitHub access
2. We fetch specific files via GitHub API
3. Files are sent to Claude API for analysis
4. Claude returns findings
5. Findings are saved to your account
6. Your source code is discarded immediately
7. Zero code written to our database

## What We Store

Your app name and repo name
Analysis results and score
Gaps found and fix prompts
Your email and profile

## What We Never Store

Your source code
Your GitHub token
Individual IP addresses

## Tech Stack

Frontend: React TypeScript via Lovable
Backend: Supabase Edge Functions
AI: Claude API by Anthropic
Email: Resend
Auth: Supabase Auth

## Live Product

rismon.ai

## Contact

hello@rismon.ai

Built by Labs3am.
