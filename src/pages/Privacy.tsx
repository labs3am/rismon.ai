import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[720px] mx-auto px-6 pt-28 pb-20">
        <h1 className="text-foreground text-4xl font-semibold">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: April 2026</p>
        <div className="mt-10 space-y-8 text-muted-foreground leading-[1.8]">
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">What we collect</h2>
            <p>Name, email, company name, and analysis results (not your code).</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">What we do not store</h2>
            <p>Your code is never stored. GitHub tokens are session only. Supabase keys are used once only.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">How we use your data</h2>
            <p>To provide analysis results and to improve Rismon.ai.</p>
          </section>
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-3">Your rights</h2>
            <p>Delete your account anytime. All data deleted with account.</p>
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
