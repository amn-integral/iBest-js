import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
    }),
    tsconfigPaths()
  ],

  optimizeDeps: {
    include: ['react', 'react-dom', 'three'], // prebundle common deps
  },
  
  build: {
    target: 'es2018',
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild', // Use 'terser' for more advanced minification
    manifest: 'manifest.json',
    reportCompressedSize: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096, 
  //   rollupOptions: {
  //     // external: ['three'], // Externalize Three.js
  //     output: {
  //       globals: {
  //         three: 'THREE' // Global variable name for Three.js
  //       },
  //       manualChunks: {
  //         'react-vendor': ['react', 'react-dom']
  //       }
  //     }
  //   }
  // },

    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor'
            if (id.includes('three')) return 'three-vendor'
            const pkg = id.toString().split('node_modules/')[1].split('/')[0]
            return `vendor-${pkg}`
          }
        },
      },
    }
  },

  css: { 
    modules: {
      scopeBehaviour: 'local',
      localsConvention: 'camelCase',
      },
    },
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif'],
  publicDir: 'public',
})
