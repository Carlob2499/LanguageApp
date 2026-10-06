/* eslint-disable react-refresh/only-export-components -- route table lives beside the app router component */
import { Shell } from '@/app/components/Shell'
import { Router, type RouteDefinition } from '@/app/router/index'
import { RouteShimmer } from '@/app/components/RouteShimmer'
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
  {
    path: '/kanji/:char',
    guard: requireOnboarding,
    load: () => import('@/app/routes/KanjiDetail'),
    exportName: 'KanjiDetailRoute',
  },
  {
    path: '/progress',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Progress'),
    exportName: 'ProgressRoute',
  },
  {
    path: '/settings',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Settings'),
    exportName: 'SettingsRoute',
  },
  {
    path: '/kana',
    guard: requireOnboarding,
    load: () => import('@/app/routes/Kana'),
    exportName: 'KanaRoute',
  },
  {
    path: '/placement',
    load: () => import('@/app/routes/Placement'),
    exportName: 'PlacementRoute',
  },
  { path: '/about', load: () => import('@/app/routes/About'), exportName: 'AboutRoute' },
  {
    path: '/welcome',
    guard: () => (useSettings.getState().settings.onboarded ? '/' : undefined),
    component: WelcomeRoute,
  },
]

export function AppRouter() {
  return (
    <Router routes={routes} notFound={NotFoundRoute} layout={Shell} fallback={<RouteShimmer />} />
  )
}
