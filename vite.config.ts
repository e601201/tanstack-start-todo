import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    // デプロイランタイムは Nitro のプリセットだけで切り替える。
    // 既定は node-server(.output/server/index.mjs)。Vercel や
    // Cloudflare へ移す場合も NITRO_PRESET を変えるだけで、
    // アプリケーションコード側は一切変更しない。
    nitro(),
  ],
})
