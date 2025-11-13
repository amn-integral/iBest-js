import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  logLevel: 'warn',
  base: mode === 'production' ? '/static/iGSDOF/dist/' : '/',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@integralrsg/imath',
        replacement: path.resolve(__dirname, mode === 'development' ? '../iMath/src' : '../iMath/dist')
      },
      {
        find: '@integralrsg/iuicomponents/styles',
        replacement: path.resolve(__dirname, mode === 'development' ? '../iUIComponents/src/styles.ts' : '../iUIComponents/dist/iuicomponents.css')
      },
      {
        find: '@integralrsg/iuicomponents',
        replacement: path.resolve(__dirname, mode === 'development' ? '../iUIComponents/src/index.ts' : '../iUIComponents/dist')
      }
    ]
  },
  server: {
    port: 5173,
    open: false, // Don't auto-open browser - let debug config handle it
    sourcemapIgnoreList: false
  },

  optimizeDeps: {
    include: ['react'] // prebundle common deps
  },

  esbuild: {
    sourcemap: mode === 'development' ? 'inline' : false,
    keepNames: true, // Keep function names for better debugging
    target: 'esnext'
  },

  worker: {
    format: 'es',
    plugins: () => [react()],
    rollupOptions: {
      output: {
        sourcemap: mode === 'development' ? 'inline' : false
      }
    }
  },

  css: {
    modules: {
      scopeBehaviour: 'local',
      localsConvention: 'camelCase',
      generateScopedName: 'iCubicle_app__[name]__[local]___[hash:base64:5]'
    },
    devSourcemap: true
  },
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif'],
  publicDir: 'public',

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development' ? 'inline' : true,
    emptyOutDir: true,
    target: 'esnext',
    minify: mode === 'development' ? false : 'esbuild',
    manifest: 'manifest.json',
    cssCodeSplit: false, // Keep CSS together for better isolation control
    assetsInlineLimit: 4096,
    // CSS isolation configuration
    cssMinify: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            const pkg = id.toString().split('node_modules/')[1].split('/')[0];
            return `vendor-${pkg}`;
          }
        }
      }
    }
  }
}));
