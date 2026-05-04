import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function Status() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Status — Rismon"
        description="Real-time uptime and reliability status for Rismon, powered by Better Stack."
      />
      <Navbar />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            System Status
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live uptime and incident history, monitored by{" "}
            <a
              href="https://rismon-ai.betteruptime.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Better Stack
            </a>
            .
          </p>
        </header>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <iframe
            src="https://rismon-ai.betteruptime.com/"
            title="Rismon status page"
            className="w-full"
            style={{ height: "calc(100vh - 220px)", minHeight: 600, border: 0 }}
            loading="lazy"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Trouble loading?{" "}
          <a
            href="https://rismon-ai.betteruptime.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Open the full status page
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
