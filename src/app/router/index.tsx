/* eslint-disable react-refresh/only-export-components -- a router module exports hooks beside its components by design */
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react'

/**
 * A small client-side router: static and `:param` paths, lazy route components, redirect guards,
 * history integration, and View Transitions where the browser offers them. It replaces a general
 * router so the first paint carries only the code this app needs.
 */
export interface RouteDefinition {
  path: string
  /** Returns a path to redirect to, or nothing to allow the route. */
  guard?: () => string | undefined
  component?: ComponentType
  load?: () => Promise<{ default: ComponentType } | Record<string, ComponentType>>
  /** Named export to use from `load()` when it isn't `default`. */
  exportName?: string
}

export interface Location {
  pathname: string
  params: Record<string, string>
}

interface RouterValue {
  location: Location
  navigate: (to: string, options?: { replace?: boolean }) => void
  preload: (to: string) => void
}

const RouterContext = createContext<RouterValue | null>(null)

interface CompiledRoute extends RouteDefinition {
  segments: string[]
  Component: ComponentType
}

function compile(route: RouteDefinition): CompiledRoute {
  let Component: ComponentType
  if (route.component) Component = route.component
  else if (route.load) {
    const load = route.load
    const name = route.exportName ?? 'default'
    Component = lazy(async () => {
      const mod = (await load()) as Record<string, ComponentType>
      const found = mod[name]
      if (!found) throw new Error(`Route ${route.path} has no export "${name}"`)
      return { default: found }
    })
  } else throw new Error(`Route ${route.path} needs a component or a loader`)
  return { ...route, segments: route.path.split('/').filter(Boolean), Component }
}

export function matchRoute(
  routes: CompiledRoute[],
  pathname: string,
): { route: CompiledRoute; params: Record<string, string> } | undefined {
  const parts = pathname.split('/').filter(Boolean)
  for (const route of routes) {
    if (route.segments.length !== parts.length) continue
    const params: Record<string, string> = {}
    let ok = true
    route.segments.forEach((seg, i) => {
      const part = parts[i] ?? ''
      if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(part)
      else if (seg !== part) ok = false
    })
    if (ok) return { route, params }
  }
  return undefined
}

/** Follows redirect guards (at most five hops) and returns the pathname that should render. */
function resolveWithGuards(routes: CompiledRoute[], to: string): string {
  let current = normalise(to)
  for (let hops = 0; hops < 5; hops++) {
    const redirect = matchRoute(routes, current)?.route.guard?.()
    if (!redirect) return current
    current = normalise(redirect)
  }
  return current
}

function normalise(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function commit(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !prefersReducedMotion()) doc.startViewTransition(update)
  else update()
}

export function Router({
  routes,
  fallback,
  notFound,
  layout: Layout,
}: {
  routes: RouteDefinition[]
  fallback?: ReactNode
  notFound: ComponentType
  /** Wraps every route; rendered inside the router context so it can read the location. */
  layout?: ComponentType<{ children: ReactNode }>
}) {
  const compiled = useMemo(() => routes.map(compile), [routes])
  // Guards apply to the initial URL too (e.g. first run → /welcome), before the first render.
  const [pathname, setPathname] = useState(() => {
    const target = resolveWithGuards(compiled, window.location.pathname)
    if (target !== normalise(window.location.pathname))
      window.history.replaceState(null, '', target)
    return target
  })

  const resolve = useCallback((to: string) => resolveWithGuards(compiled, to), [compiled])

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const target = resolve(to)
      const method =
        options?.replace || target === normalise(window.location.pathname)
          ? 'replaceState'
          : 'pushState'
      window.history[method](null, '', target)
      commit(() => {
        setPathname(target)
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      })
    },
    [resolve],
  )

  const preload = useCallback(
    (to: string) => {
      const match = matchRoute(compiled, normalise(to))
      void match?.route.load?.()
    },
    [compiled],
  )

  useEffect(() => {
    const onPop = () => {
      const next = resolve(window.location.pathname)
      if (next !== normalise(window.location.pathname)) window.history.replaceState(null, '', next)
      commit(() => setPathname(next))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [resolve])

  const match = matchRoute(compiled, pathname)
  const value = useMemo<RouterValue>(
    () => ({ location: { pathname, params: match?.params ?? {} }, navigate, preload }),
    [match?.params, navigate, pathname, preload],
  )
  const Component = match?.route.Component ?? notFound

  const page = (
    <Suspense fallback={fallback ?? null}>
      <Component />
    </Suspense>
  )
  return (
    <RouterContext.Provider value={value}>
      {Layout ? <Layout>{page}</Layout> : page}
    </RouterContext.Provider>
  )
}

function useRouter(): RouterValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('Router context is missing; render inside <Router>')
  return ctx
}

export function useLocation(): Location {
  return useRouter().location
}

export function useNavigate(): RouterValue['navigate'] {
  return useRouter().navigate
}

export function useParams(): Record<string, string> {
  return useRouter().location.params
}

export function Link({
  to,
  exact = false,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; exact?: boolean; children: ReactNode }) {
  const { location, navigate, preload } = useRouter()
  const active = exact
    ? location.pathname === normalise(to)
    : location.pathname.startsWith(normalise(to))
  return (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => preload(to)}
      onFocus={() => preload(to)}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
