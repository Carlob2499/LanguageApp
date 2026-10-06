import { renderToStaticMarkup } from 'react-dom/server'

import shell from '@/app/components/Shell.module.css'
import { WelcomeIntro } from '@/app/routes/WelcomeIntro'
import welcome from '@/app/routes/Welcome.module.css'

/**
 * Static markup for the first screen, built once at build time and placed inside #root so the
 * headline paints before any JavaScript arrives. The structure mirrors Shell + WelcomeRoute at
 * their first client render (hero box empty, tab bar hidden), so swapping in the live tree
 * moves nothing.
 */
export function render(): string {
  return renderToStaticMarkup(
    <div className={shell.shell} data-focused="true">
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={shell.main} tabIndex={-1}>
        <section className={welcome.welcome} aria-live="polite">
          <WelcomeIntro showHero={false} inert />
        </section>
      </main>
    </div>,
  )
}
