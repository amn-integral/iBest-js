// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    logLevel: 'warn',

    // In dev we serve from /, in prod Django serves from /static/iCubicle/dist/
    base: isDev ? '/' : '/static/iCubicle/dist/',

    plugins: [react()],

    resolve: {
      alias: [
        {
          find: '@integralrsg/imath',
          replacement: path.resolve(__dirname, isDev ? '../iMath/src' : '../iMath/dist')
        },
        {
          find: '@integralrsg/iuicomponents/styles',
          replacement: path.resolve(__dirname, isDev ? '../iUIComponents/src/styles.ts' : '../iUIComponents/dist/iuicomponents.css')
        },
        {
          find: '@integralrsg/iuicomponents',
          replacement: path.resolve(__dirname, isDev ? '../iUIComponents/src/index.ts' : '../iUIComponents/dist')
        }
      ]
    },

    server: {
      port: 5174,
      open: false,
      host: true,
      hmr: {
        host: '10.71.10.135'
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false
        }
      }
    },

    optimizeDeps: {
      // Pre bundle the heavy stuff used in dev
      include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
    },

    esbuild: {
      // Better stack traces & preserved function names
      keepNames: true,
      target: 'esnext'
    },

    css: {
      modules: {
        scopeBehavior: 'local',
        localsConvention: 'camelCase',
        generateScopedName: 'iCalcPad_app__[name]__[local]___[hash:base64:5]'
      },
      devSourcemap: true
    },

    assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif'],

    publicDir: 'public',

    build: {
      outDir: 'dist',
      sourcemap: true,
      emptyOutDir: true,
      target: 'esnext',
      minify: false,
      cssCodeSplit: false,
      assetsInlineLimit: 4096,
      cssMinify: !isDev,
      manifest: 'manifest.json',
      // Bigger apps (React + Three) often exceed 500KB; bump the limit
      chunkSizeWarningLimit: 1500, // in KB

      rollupOptions: {
        // Multiple entry points
        input: {
          main: path.resolve(__dirname, 'index.html'),
          'storage/save-widget': path.resolve(__dirname, 'src/widgets/save-widget.ts')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // Widget gets its own file without hash
            if (chunkInfo.name === 'storage/save-widget') {
              return 'storage/save-widget.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',

          // Simplified chunking: group tightly coupled dependencies
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // Everything React + Three + R3F together to avoid circular deps
            if (
              id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('use-sync-external-store') ||
              id.includes('zustand') ||
              id.includes('its-fine') ||
              id.includes('react-reconciler') ||
              id.includes('three') ||
              id.includes('@react-three/fiber') ||
              id.includes('@react-three/drei') ||
              id.includes('troika') ||
              id.includes('bidi-js') ||
              id.includes('webgl-sdf-generator')
            ) {
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
