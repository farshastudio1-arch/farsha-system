function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[color-mix(in_srgb,var(--theme-text)_10%,var(--theme-surface))] ${className}`}
    />
  );
}

function SkeletonHeader({ catalog = false }: { catalog?: boolean }) {
  return (
    <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md">
      <div
        className={`relative mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8 ${
          catalog ? 'justify-between' : 'justify-center'
        }`}
      >
        <div className={`flex flex-col ${catalog ? 'items-start' : 'items-center'}`}>
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="mt-1 h-2 w-20" />
        </div>
        {catalog && <SkeletonBlock className="h-11 w-11" />}
      </div>
    </header>
  );
}

export function LandingPageSkeleton() {
  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased" aria-busy="true">
      <SkeletonHeader />

      <main className="flex-grow">
        <section className="landing-hero-satin relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
            <div className="landing-hero-grid">
              <div className="theme-border border-b pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8 md:text-center lg:text-left">
                <SkeletonBlock className="h-3 w-40 md:mx-auto lg:mx-0" />
                <SkeletonBlock className="mt-4 h-10 w-full max-w-lg sm:h-12 md:mx-auto lg:mx-0" />
                <SkeletonBlock className="mt-3 h-10 w-5/6 max-w-md md:mx-auto lg:mx-0" />
                <div className="mt-6 flex w-full flex-col gap-2.5 sm:max-w-[420px] md:mx-auto lg:mx-0">
                  <SkeletonBlock className="h-12 w-full" />
                  <SkeletonBlock className="h-12 w-full" />
                  <SkeletonBlock className="h-12 w-full" />
                </div>
              </div>

              <div>
                <div className="theme-border grid grid-cols-[minmax(0,1fr)_96px] gap-3 border p-2 sm:grid-cols-[minmax(0,1fr)_128px]">
                  <SkeletonBlock className="aspect-[3/2]" />
                  <div className="theme-border flex flex-col justify-between border-l px-3 py-3">
                    <div className="space-y-2">
                      <SkeletonBlock className="h-2.5 w-full" />
                      <SkeletonBlock className="h-2.5 w-5/6" />
                      <SkeletonBlock className="h-2.5 w-2/3" />
                    </div>
                    <SkeletonBlock className="h-8 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="theme-surface theme-border border-t py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="theme-border mb-5 flex items-end justify-between gap-5 border-b pb-4">
              <div>
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="mt-3 h-8 w-56" />
              </div>
              <div className="hidden h-px flex-1 bg-[var(--theme-border)] sm:block" />
            </div>

            <div className="landing-category-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="theme-border border">
                  <SkeletonBlock className="aspect-[4/5]" />
                  <div className="space-y-2 p-3">
                    <SkeletonBlock className="h-3 w-24" />
                    <SkeletonBlock className="h-6 w-3/4" />
                    <SkeletonBlock className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function CatalogPageSkeleton() {
  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased" aria-busy="true">
      <SkeletonHeader catalog />

      <main className="flex-grow">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <SkeletonBlock className="h-11 w-full" />

          <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] pb-4">
            <div className="flex gap-2">
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="h-10 w-32" />
            </div>
            <SkeletonBlock className="hidden h-10 w-40 sm:block" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="theme-border border bg-[var(--theme-surface)]">
                <SkeletonBlock className="aspect-[4/5]" />
                <div className="space-y-3 p-4">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="h-7 w-3/4" />
                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-2">
                      <SkeletonBlock className="h-3 w-20" />
                      <SkeletonBlock className="h-6 w-36" />
                    </div>
                    <div className="flex gap-1.5">
                      <SkeletonBlock className="h-6 w-14" />
                      <SkeletonBlock className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
