import { defineConfig } from "vite";
import path from "path";
export default defineConfig({
//   logLevel: 'warn', 
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "iMath",
      formats: ["es", "cjs"],
        fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      // External dependencies that shouldn’t be bundled (optional)
      external: [],
      output: {
        globals: {},
      },
    },
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
  },
  css: {
    modules: {
      scopeBehaviour: "local",
      localsConvention: "camelCase",
    },
  },
});
