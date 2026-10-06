/// <reference lib="webworker" />
import { clientsClaim, type WorkboxPlugin } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// Bump when the runtime cache shape changes; old names are deleted on activate.
const RUNTIME_VERSION = 'v1'
const PACKS_CACHE = `kintsugi-packs-${RUNTIME_VERSION}`
const FONTS_CACHE = `kintsugi-fonts-${RUNTIME_VERSION}`
const MEDIA_CACHE = `kintsugi-media-${RUNTIME_VERSION}`
const LAZY_CACHE = `kintsugi-lazy-${RUNTIME_VERSION}`

// Activation is deferred: the page posts SKIP_WAITING only when no review is open.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data: unknown = event.data
  if (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: string }).type === 'SKIP_WAITING'
  ) {
    void self.skipWaiting()
  }
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('kintsugi-') && !key.endsWith(RUNTIME_VERSION))
            .map((key) => caches.delete(key)),
        ),
      ),
  )
})

// App shell for navigations (SPA).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Content packs: serve cached, refresh in the background (packs are versioned by data:update).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/packs/'),
  new StaleWhileRevalidate({ cacheName: PACKS_CACHE }),
)

// Font slices: immutable, cache first. (ExpirationPlugin's optional callbacks are typed without
// `undefined`, which trips exactOptionalPropertyTypes; the cast only widens them.)
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    /\.woff2?$/.test(url.pathname),
  new CacheFirst({
    cacheName: FONTS_CACHE,
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 365 * 24 * 3600 }) as WorkboxPlugin,
    ],
  }),
)

// Hashed chunks left out of the precache (the 3D scene): immutable, cache first, bounded.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/assets/') &&
    /\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: LAZY_CACHE,
    plugins: [
      new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 365 * 24 * 3600 }) as WorkboxPlugin,
    ],
  }),
)

// Audio clips: cache first, bounded.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/audio/'),
  new CacheFirst({
    cacheName: MEDIA_CACHE,
    plugins: [
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 180 * 24 * 3600 }) as WorkboxPlugin,
    ],
  }),
)
