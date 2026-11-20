/** The house disclaimer, on every page (phase 1 spec 5.2). */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sand">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted sm:px-6">
        <p>
          Numerology describes tendencies, not certainties. Reports are not medical, legal or
          financial advice.
        </p>
        <p className="mt-1 font-label">
          KalaChakra · phase 1 preview · nothing you enter is stored on a server
        </p>
      </div>
    </footer>
  );
}
