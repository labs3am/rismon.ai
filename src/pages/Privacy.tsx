import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy — Rismon.ai"
        description="How Rismon.ai handles your code, GitHub tokens, and Supabase keys. Read-only access, no source code stored, transparent data flow."
        canonicalPath="/privacy"
        robots="index, follow"
      />
      <Navbar />
      <div className="max-w-[720px] mx-auto px-6 pt-28 pb-20">
        <BackButton useHistory label="Back" />
        <h1 className="text-foreground text-4xl font-semibold">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: May 17, 2026</p>
        <div className="mt-10 space-y-8 text-muted-foreground leading-[1.8]">
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">What we collect</h2>
            <p>Name, email, company name, and analysis results (not your code).</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Promise Audit (anonymous, no login)</h2>
            <p>The free Promise Audit lets anyone paste a public URL and grade the marketing claims on that page. Here's exactly what happens:</p>
            <ul className="list-disc list-inside mt-2 space-y-1.5">
              <li>We fetch the public HTML of the URL you provide (the same content any visitor would see).</li>
              <li>The visible text, title, and meta description are sent to the Lovable AI Gateway to extract and classify claims.</li>
              <li>We store the URL, hostname, extracted claims, and clarity score so the audit can be shared via a permalink.</li>
              <li>To enforce a 3-audits-per-day fair-use limit, we store a one-way SHA-256 hash of your IP address. We never store the raw IP, and the hash cannot be reversed to identify you.</li>
              <li>No login, no cookies, no code, and no private pages are ever read.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">How your code is handled</h2>
            <p>When you run an analysis, your code follows this exact path:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1.5">
              <li>Your browser fetches files from GitHub using your session token.</li>
              <li>The code is sent to our edge function (server-side processing).</li>
              <li>The edge function forwards the code to Anthropic (Claude) for analysis.</li>
              <li>The analysis results are saved. The code is immediately discarded.</li>
            </ol>
            <p className="mt-3">No source code is ever written to our database. You can verify this in our <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">open source repository</a>.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">What we do not store</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Your source code is never stored.</li>
              <li>GitHub tokens are session-only and expire when you close the tab.</li>
              <li>Supabase anon keys are used once during analysis and not retained beyond your app record.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">IP addresses</h2>
            <p>We do not log, store, or track individual IP addresses. Our hosting provider (Lovable) provides only aggregated country-level visitor analytics with no personally identifiable information. Our edge functions do not log IP addresses.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">GitHub permissions</h2>
            <p>We request read-only access to your repositories. We cannot modify, delete, or push code to your GitHub account. You can revoke access anytime from your <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub Settings → Applications</a>.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Third-party processors</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong className="text-foreground">Anthropic (Claude)</strong> — processes code snippets during analysis. Per their <a href="https://www.anthropic.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API privacy policy</a>, API inputs are not used for training and are not retained after processing.</li>
              <li><strong className="text-foreground">Lovable AI Gateway</strong> — processes the text of public pages submitted to the Promise Audit. Inputs are used only to return the audit result and are not used for model training.</li>
              <li><strong className="text-foreground">Supabase</strong> — hosts our database and authentication. Stores your account and analysis results only.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Open source transparency</h2>
            <p>Rismon.ai is fully open source. You can read every line of code that touches your data on our <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub repository</a>. Nothing is hidden.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">How we use your data</h2>
            <p>To provide analysis results and to improve Rismon.ai.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Your rights</h2>
            <p>Delete your account anytime. All data is deleted with your account.</p>
          </section>

          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Contact</h2>
            <p><a href="mailto:hello@rismon.ai" className="text-primary hover:underline">hello@rismon.ai</a></p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
