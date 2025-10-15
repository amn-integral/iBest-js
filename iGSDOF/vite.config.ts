import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
    },
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
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
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
  }
});
