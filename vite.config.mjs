import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  const appleProxyApiTarget = process.env.VITE_DEV_APPLE_PROXY_API_TARGET || 'http://127.0.0.1:8000'

  return {
    base: '/',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [autoprefixer({})],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/proxy-manager': {
          target: appleProxyApiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
