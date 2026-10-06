/* eslint-disable react-refresh/only-export-components -- route table lives beside the app router component */
import { Shell } from '@/app/components/Shell'
import { Router, type RouteDefinition } from '@/app/router/index'
import { AboutRoute } from '@/app/routes/About'
import { NotFoundRoute } from '@/app/routes/NotFound'
import { WelcomeRoute } from '@/app/routes/Welcome'
import { useSettings } from '@/app/study/settings'

const requireOnboarding = () => (useSettings.getState().settings.onboarded ? undefined : '/welcome')

export const routes: RouteDefinition[] = [
  {
    path: '/',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Today'),
    exportName: 'TodayRoute',
  },
  {
    path: '/review',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Review'),
    exportName: 'ReviewRoute',
  },
  {
    path: '/library',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Library'),
    exportName: 'LibraryRoute',
  },
  { path: '/about', component: AboutRoute },
  {
    path: '/welcome',
    guard: () => (useSettings.getState().settings.onboarded ? '/' : undefined),
    component: WelcomeRoute,
  },
]

export function AppRouter() {
  return <Router routes={routes} notFound={NotFoundRoute} layout={Shell} />
}
