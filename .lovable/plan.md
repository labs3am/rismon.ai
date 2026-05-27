Update the social-proof stats on the homepage hero and Promise Audit page.

Problem: the "Last 24h" counter drops to 0 when no one scans recently, and the "Live" pulse feels empty. We replace both with cumulative, ever-growing numbers that always feel genuine.

Changes

1. Database — update public_audit_stats()  
Replace total_24h with two new aggregates:
- promises_analyzed = SUM(promise_count) across all public_audits  
- vague_claims_caught = SUM(vague_count) across all public_audits  
Keep total_all_time.

2. Homepage (src/pages/Index.tsx)  
Replace the 3-stat row under the hero CTA:
- Sites audited  (kept, total_all_time)  
- Promises analyzed  (new, promises_analyzed)  
- Vague claims caught  (new, vague_claims_caught)  
Remove the "Last 24h" and "Live" columns.

3. Promise Audit page (src/pages/PromiseAudit.tsx)  
Same 3-stat row above the URL input form, using the same three numbers.

Technical notes
- The block is already hidden when there are zero audits (total_all_time > 0 guard), so we never show 0s.
- Frontend uses loose `any` typing on the RPC response, so no immediate type breakage.
- Supabase types file will regenerate after the migration.