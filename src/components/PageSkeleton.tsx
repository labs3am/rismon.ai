/**
 * Full-page skeleton loader. Replaces the spinning circle that used to be
 * shown for lazy route loading, auth gating, and initial page data fetches.
 *
 * Variants:
 *  - "default": a generic header + content block layout (lazy routes).
 *  - "dashboard": header row, stat cards, table — for /admin and /dashboard.
 *  - "article": narrow column for blog/legal pages.
 */

type Variant = "default" | "dashboard" | "article";

const shimmer =
  "relative overflow-hidden bg-muted/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md ${shimmer} ${className}`} />;
}

export default function PageSkeleton({ variant = "default", withNav = false }: { variant?: Variant; withNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      {withNav && (
        <div className="h-16 border-b border-border/40 flex items-center px-6 gap-4">
          <Bar className="h-6 w-24" />
          <div className="ml-auto flex gap-3">
            <Bar className="h-6 w-16" />
            <Bar className="h-6 w-16" />
            <Bar className="h-8 w-8 rounded-full" />
          </div>
        </div>
      )}
      <div className={`mx-auto px-4 sm:px-6 ${withNav ? "pt-10" : "pt-24"} pb-16 ${variant === "article" ? "max-w-3xl" : "max-w-[1200px]"}`}>
        {variant === "dashboard" ? (
          <>
            <Bar className="h-8 w-56" />
            <Bar className="h-4 w-80 mt-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5">
                  <Bar className="h-3 w-20" />
                  <Bar className="h-7 w-16 mt-3" />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 mt-6">
              <Bar className="h-5 w-40" />
              <div className="mt-5 space-y-3">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Bar className="h-9 w-9 rounded-full" />
                    <Bar className="h-3 flex-1 max-w-[40%]" />
                    <Bar className="h-3 w-20" />
                    <Bar className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : variant === "article" ? (
          <>
            <Bar className="h-10 w-3/4" />
            <div className="flex gap-3 mt-4">
              <Bar className="h-4 w-24" />
              <Bar className="h-4 w-32" />
            </div>
            <Bar className="h-64 w-full mt-8 rounded-xl" />
            <div className="mt-8 space-y-3">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <Bar key={i} className={`h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
          </>
        ) : (
          <>
            <Bar className="h-8 w-64" />
            <Bar className="h-4 w-96 mt-3" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5">
                  <Bar className="h-5 w-32" />
                  <Bar className="h-3 w-full mt-3" />
                  <Bar className="h-3 w-2/3 mt-2" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}