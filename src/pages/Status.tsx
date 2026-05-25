import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function Status() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Status — Rismon"
        description="Real-time uptime and reliability status for Rismon, powered by Better Stack."
        robots="index, follow"
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
        <div className="rounded-lg border border-border overflow-hidden bg-card -mx-4 sm:mx-0">
          <div className="w-full overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <iframe
              src="https://rismon-ai.betteruptime.com/"
              title="Rismon status page"
              loading="lazy"
              className="block w-full border-0 h-[70vh] min-h-[520px] sm:h-[75vh] sm:min-h-[640px] lg:h-[80vh] lg:min-h-[760px]"
              scrolling="yes"
            />
          </div>
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
