import Shell from "../components/Shell";

export default function NotFoundPage() {
  return (
    <Shell>
      <main className="page narrow centered">
        <section className="hero-card">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <a className="primary-button" href="/">
            Go Home
          </a>
        </section>
      </main>
    </Shell>
  );
}
