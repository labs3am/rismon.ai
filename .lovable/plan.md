

## Build Trust: Privacy and Transparency Improvements

The Reddit user raises two concerns: (1) fear of source code theft, and (2) IP logging. Here's what we can do:

### What's true about Rismon.ai's architecture

- Code is read client-side via GitHub API, sent to an edge function, forwarded to Claude, and discarded. No code is stored in the database.
- GitHub tokens are session-scoped OAuth tokens with read-only access.
- Lovable's hosting analytics tracks country-level geo, not individual IPs. Your edge functions don't log IPs either.
- The app is open-source on GitHub — anyone can verify the code.

### Changes to implement

**1. Add a dedicated "Security & Privacy" trust section on the landing page**
Between the "Plain English" section and Pricing, add a new section with shield icon and clear statements:
- "Your code is never stored" — read in memory, sent to AI, discarded
- "Read-only GitHub access" — we cannot modify your code
- "No IP logging" — we don't log or store IP addresses
- "Open source" — link to the GitHub repo so anyone can verify
- "Session-only tokens" — GitHub tokens expire when you close the tab

**2. Expand the Privacy Policy page**
Add detailed sections:
- **Code handling**: Explain the exact flow (GitHub API → edge function → Claude → discarded). No database storage of code.
- **IP addresses**: Explicitly state "We do not log, store, or track IP addresses. Our hosting provides aggregated country-level analytics only."
- **Open source transparency**: Link to the repo. "You can read every line of code that touches your data."
- **GitHub permissions**: Explain read-only scope, session-only tokens, how to revoke access.
- **Third-party processors**: Mention Anthropic (Claude) processes code snippets but does not retain them per their API terms.

**3. Add FAQ entries on the landing page**
Add 2 new FAQ items:
- "Do you log my IP address?" → "No. We do not log or store IP addresses. Our hosting provides only aggregated country-level visitor counts."
- "Can I verify your claims?" → "Yes. Rismon.ai is fully open source. You can read every line of code on our GitHub."

**4. Add a trust banner on the Connect page**
On the page where users connect their GitHub repo, show a small reassurance card:
- Shield icon + "Read-only access. Your code is never stored. Verify our source code on GitHub."

### Files to modify
- `src/pages/Index.tsx` — new trust section + 2 FAQ items
- `src/pages/Privacy.tsx` — expanded policy with IP, code flow, GitHub, and third-party sections
- `src/pages/Connect.tsx` — trust reassurance card

### What to tell the Reddit commenter
After these changes ship, you can reply with something like:
> "Rismon.ai is fully open source — you can read every line of code that touches your data. We use read-only GitHub access, code is processed in memory and never stored, and we don't log IP addresses. Check our privacy policy and source code."

