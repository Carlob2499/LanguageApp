import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * The entry stylesheet is small (about 5 kB gzip) and render-blocking, so it goes inline in
 * index.html: one round trip fewer before the first paint on a slow connection.
 */
function inlineEntryCss(): Plugin {
  return {
    name: 'kintsugi:inline-entry-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        return html.replace(
          /<link rel="stylesheet"[^>]*href="\/(assets\/index-[^"]+\.css)"[^>]*>/,
          (tag, file: string) => {
            const asset = bundle[file]
            if (!asset || asset.type !== 'asset') return tag
            const css =
              typeof asset.source === 'string'
                ? asset.source
                : new TextDecoder().decode(asset.source)
            delete bundle[file]
            return `<style>${css}</style>`
          },
        )
      },
    },
  }
}

/**
 * Puts the prerendered welcome markup (built first by `vite build --ssr src/prerender.tsx`)
 * inside #root, so the first paint is the real headline rather than an empty page. A returning
 * learner never sees it: the boot script in index.html marks the document and CSS hides it.
 */
function prerenderWelcome(): Plugin {
  return {
    name: 'kintsugi:prerender-welcome',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      async handler(html, ctx) {
        if (!ctx.bundle) return html
        const built = fileURLToPath(new URL('./.prerender/prerender.js', import.meta.url))
        if (!existsSync(built)) {
          throw new Error('Run "vite build --ssr src/prerender.tsx --outDir .prerender" first')
        }
        const { render } = (await import(pathToFileURL(built).href)) as { render: () => string }
        return html.replace(
          '<div id="root"></div>',
          `<div id="root"><div data-prerender>${render()}</div></div>`,
        )
      },
    },
  }
}

/**
 * The entry module and its preloads are requested one frame after the prerendered markup has
 * painted, from the small loader at the end of index.html, instead of by the preload scanner.
 * The first paint then competes with nothing; the scripts start a few milliseconds later.
 */
function deferEntryScripts(): Plugin {
  return {
    name: 'kintsugi:defer-entry-scripts',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const scriptTag = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/
        const preloadTag = /<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g
        const entry = scriptTag.exec(html)?.[1]
        if (!entry) throw new Error('index.html has no module entry script to defer')
        const preloads = [...html.matchAll(preloadTag)].map((m) => m[1])
        return html
          .replace(scriptTag, '')
          .replace(preloadTag, '')
          .replace(
            'data-entry="" data-preload=""',
            `data-entry="${entry}" data-preload="${preloads.join(',')}"`,
          )
      },
    },
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    inlineEntryCss(),
    prerenderWelcome(),
    deferEntryScripts(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Kintsugi',
        short_name: 'Kintsugi',
        description:
          'Learn Japanese kanji and vocabulary from kana to JLPT N1. Mistakes, repaired in gold.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1C0D0B',
        theme_color: '#1C0D0B',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        // The 3D scene's chunk is fetched on first use and kept by the runtime cache; precaching
        // it would cost every install 880 kB for a screen most sessions never open.
        globIgnores: ['**/three-*.js', '**/Assembly-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // The prerender build only needs its one module, not a copy of public/.
    copyPublicDir: !isSsrBuild,
    // three alone is 880 kB before gzip; it lives in a lazy chunk with its own size-limit budget.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/,
            },
            { name: 'db', test: /node_modules[\\/](dexie|dexie-react-hooks)[\\/]/ },
            {
              name: 'three',
              test: /node_modules[\\/](three|@react-three|react-reconciler|its-fine|suspend-react|react-use-measure)[\\/]/,
            },
            { name: 'srs', test: /node_modules[\\/]ts-fsrs[\\/]/ },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
            },
          ],
        },
      },
    },
  },
}))
