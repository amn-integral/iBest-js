import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path'

export default defineConfig(({ mode }) => ({
  logLevel: 'warn', 
  base: mode === "production" ? "/static/iGSDOF/dist/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      '@integralrsg/imath': path.resolve(
        __dirname,
        mode === 'development' ? '../iMath/src' : '../iMath/dist'
      ),
      '@integralrsg/igraph': path.resolve(
        __dirname,
        mode === 'development' ? '../iGraph/src' : '../iGraph/dist'
      ),
    },
  },
  server: {
    port: 5173,
    open: true,
  },

  optimizeDeps: {
    include: ["react"], // prebundle common deps
  },

  css: {
    modules: {
      scopeBehaviour: "local",
      localsConvention: "camelCase",
      // Enhanced CSS isolation with stronger scoping
      // generateScopedName: (name, filename) => {
      //   // Generate highly unique class names resistant to Django/Bootstrap conflicts
      //   const fileId =
      //     filename
      //       .split("/")
      //       .pop()
      //       ?.replace(/\.[^/.]+$/, "")
      //       .replace(/[^a-zA-Z0-9]/g, "") || "comp";
      //   // Simple hash generation without Node.js dependencies
      //   let hash = 0;
      //   const str = filename + name;
      //   for (let i = 0; i < str.length; i++) {
      //     const char = str.charCodeAt(i);
      //     hash = (hash << 5) - hash + char;
      //     hash = hash & hash; // Convert to 32bit integer
      //   }
      //   const hashStr = Math.abs(hash).toString(36).substring(0, 6);
      //   return `reactapp-${fileId}-${name}-${hashStr}`;
      // },
      // // Ensure all modules get isolated scoping
      // globalModulePaths: [],
    },
    // CSS processing options for better isolation
    devSourcemap: true,
  },
  assetsInclude: ["**/*.svg", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif"],
  publicDir: "public",

  build: {
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
    target: "esnext",
    minify: "esbuild",
    manifest: "manifest.json",
    cssCodeSplit: false, // Keep CSS together for better isolation control
    assetsInlineLimit: 4096,
    // CSS isolation configuration
    cssMinify: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "react-vendor";
            const pkg = id.toString().split("node_modules/")[1].split("/")[0];
            return `vendor-${pkg}`;
          }
        },
      },
    },
  },
}));
