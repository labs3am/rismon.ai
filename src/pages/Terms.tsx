import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AlertTriangle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service — Rismon.ai"
        description="Terms governing use of Rismon.ai. Analysis is advisory and does not replace a professional security audit for production apps."
        canonicalPath="/terms"
      />
      <Navbar />
      <div className="max-w-[720px] mx-auto px-6 pt-28 pb-20">
        <BackButton useHistory label="Back" />
        <h1 className="text-foreground text-4xl font-semibold">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: May 25, 2026</p>

        <div className="flex items-start gap-3 mt-8 p-4 rounded-xl" style={{ background: '#191207', border: '1px solid #3a2810' }}>
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground text-sm">Rismon.ai provides analysis assistance only and does not guarantee the security or correctness of any application. Always consult a qualified professional for production applications handling sensitive data.</p>
        </div>

        <div className="mt-10 space-y-8 text-muted-foreground leading-[1.8]">
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Acceptance of Terms</h2>
            <p>By using Rismon.ai, you agree to these terms. If you do not agree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Service Description</h2>
            <p>Rismon.ai provides automated code analysis for AI-built applications. Results are advisory only and should not be considered a substitute for professional security audits.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">User Responsibilities</h2>
            <p>You are responsible for the security of your applications. Rismon.ai analysis is provided as guidance only.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Acceptable use</h2>
            <p>To keep Rismon.ai safe and useful for everyone, you agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1.5">
              <li>Attempt to manipulate, jailbreak, or override the AI models that power our scans, contact form, or any other surface (prompt injection, instruction overrides, etc.). Suspicious payloads are filtered automatically and may result in account suspension.</li>
              <li>Submit content designed to attack other users, leak credentials, distribute malware, or exfiltrate code from our infrastructure.</li>
              <li>Use disposable, throwaway, or fraudulent email addresses to sign up, join the waitlist, or contact us. We block known disposable domains at submission time.</li>
              <li>Connect repositories, paste URLs, or upload content you do not have the legal right to analyze.</li>
              <li>Scrape, mass-automate, or otherwise abuse our APIs, scan endpoints, or Promise Audit. Programmatic access requires written permission.</li>
              <li>Attempt to bypass per-account scan limits, fair-use limits, or any other technical or policy-based limit.</li>
            </ul>
            <p className="mt-3">We reserve the right to block, rate-limit, or terminate any account that violates this section, with or without notice.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Data Handling</h2>
            <p>We read your code for analysis purposes only. Code is never stored on our servers. See our Privacy Policy for details.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Promise Audit (free public tool)</h2>
            <p>The Promise Audit is a free tool that fetches a public URL and grades its marketing claims using AI. By using it you agree that:</p>
            <ul className="list-disc list-inside mt-2 space-y-1.5">
              <li>You will only submit URLs you have the right to audit. Don't use the tool to scrape, harass, or attack any site.</li>
              <li>Each IP is limited to 3 audits per 24 hours. Attempts to bypass this limit may be blocked.</li>
              <li>AI grading is best-effort and may misclassify claims. Results are advisory, not a legal or marketing certification.</li>
              <li>Audit results are stored and accessible by their permalink. Don't audit URLs that contain private information in the path.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Limitation of Liability</h2>
            <p>Rismon.ai is not liable for any damages resulting from the use of our service or reliance on our analysis results.</p>
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
