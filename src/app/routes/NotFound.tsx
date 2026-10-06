import { Link } from '@/app/router/index'

export function NotFoundRoute() {
  return (
    <section
      aria-labelledby="missing-title"
      style={{ display: 'grid', gap: 'var(--sp-4)', paddingBlock: 'var(--sp-6)' }}
    >
      <h1 id="missing-title">There's nothing here.</h1>
      <p style={{ color: 'var(--fg-muted)' }}>That link doesn't go anywhere in Kintsugi.</p>
      <Link to="/">Back to today</Link>
    </section>
  )
}
