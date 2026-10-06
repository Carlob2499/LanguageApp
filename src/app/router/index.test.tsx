// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Link, Router, useParams, type RouteDefinition } from './index'

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <Link to="/kanji/駅" data-testid="go">
        go
      </Link>
    </div>
  )
}
function Kanji() {
  const { char } = useParams()
  return <h1>Kanji {char}</h1>
}
function Gate() {
  return <h1>Gate</h1>
}
function Missing() {
  return <h1>Missing</h1>
}

describe('Router', () => {
  it('matches params, applies guards, and navigates through links and history', async () => {
    window.history.replaceState(null, '', '/private')
    const routes: RouteDefinition[] = [
      { path: '/', component: Home },
      { path: '/kanji/:char', component: Kanji },
      { path: '/private', component: Home, guard: () => '/gate' },
      { path: '/gate', component: Gate },
    ]
    render(<Router routes={routes} notFound={Missing} />)
    expect(await screen.findByRole('heading', { name: 'Gate' })).toBeTruthy()
    expect(window.location.pathname).toBe('/gate')

    act(() => {
      window.history.pushState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeTruthy()

    act(() => {
      screen.getByTestId('go').click()
    })
    expect(await screen.findByRole('heading', { name: 'Kanji 駅' })).toBeTruthy()
    expect(decodeURIComponent(window.location.pathname)).toBe('/kanji/駅')

    act(() => {
      window.history.pushState(null, '', '/nowhere')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(await screen.findByRole('heading', { name: 'Missing' })).toBeTruthy()
  })
})
