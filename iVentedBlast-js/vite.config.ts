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
  build: {
    manifest: 'manifest.json',
    outDir: 'CAFE\projects\www\ibest_root\iVentedBlast\static\iVentedBlast\dist',
    emptyOutDir: true,
    rollupOptions: {
      // external: ['three'], // Externalize Three.js
      output: {
        globals: {
          three: 'THREE' // Global variable name for Three.js
        },
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
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
