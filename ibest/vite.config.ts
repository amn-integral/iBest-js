import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  logLevel: 'info',
  base: mode === 'production' ? '/static/vite_build/' : '/',
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
    host: true,
    port: 5173,
    open: false, // Don't auto-open browser - let debug config handle it
    sourcemapIgnoreList: false,
    strictPort: true
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
      generateScopedName: (name, filename, css) => {
        // Determine which app this file belongs to based on path
        let appPrefix = 'ibest';
        if (filename.includes('/apps/igsdof/')) {
          appPrefix = 'igsdof';
        } else if (filename.includes('/apps/icubicle/')) {
          appPrefix = 'icubicle';
        } else if (filename.includes('/apps/icalcpad/')) {
          appPrefix = 'icalcpad';
        }
        
        // Extract just the component name from the filename
        const componentName = filename.split('/').pop()?.replace('.module.css', '') || 'unknown';
        
        // Generate a simple hash from the css content + filename + classname
        const hash = Buffer.from(`${filename}${name}${css}`).toString('base64').slice(0, 5);
        
        // Generate a unique scoped class name per app
        return `${appPrefix}__${componentName}__${name}___${hash}`;
      }
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
    cssCodeSplit: true, // Enable CSS code splitting per entry
    assetsInlineLimit: 4096,
    cssMinify: true,
    rollupOptions: {
      // Multiple entry points for each app
      input: {
        index: path.resolve(__dirname, 'index.html'),
        igsdof: path.resolve(__dirname, 'igsdof.html'),
        icubicle: path.resolve(__dirname, 'icubicle.html'),
        icalcpad: path.resolve(__dirname, 'icalcpad.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          // Don't chunk node_modules for better control
          if (id.includes('node_modules')) {
            // Three.js and related - only for iCubicle (check BEFORE react to avoid conflict)
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            
            // React and React DOM - shared by all apps
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-vendor';
            }
            
            // Chart.js - shared by iGSDOF and iCubicle
            if (id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'chart-vendor';
            }
            
            // Dexie - only for iCalcPad
            if (id.includes('dexie')) {
              return 'dexie-vendor';
            }
            
            // WebGL Plot - only for iGSDOF
            if (id.includes('webgl-plot')) {
              return 'webgl-plot-vendor';
            }
            
            // PDF libraries - shared by iGSDOF and iCubicle
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            
            // Our workspace packages
            if (id.includes('@integralrsg/imath')) {
              return 'imath-vendor';
            }
            if (id.includes('@integralrsg/iuicomponents')) {
              return 'iuicomponents-vendor';
            }
            
            // All other node_modules go into a common vendor chunk
            return 'vendor-common';
          }
        }
      }
    }
  }
}));
