import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'

import { Shell } from '@/app/components/Shell'
import { AboutRoute } from '@/app/routes/About'
import { TodayRoute } from '@/app/routes/Today'

const rootRoute = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
})

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TodayRoute,
})
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutRoute,
})

const routeTree = rootRoute.addChildren([todayRoute, aboutRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
