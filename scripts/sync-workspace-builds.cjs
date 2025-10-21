#!/usr/bin/env node

/**
 * Sync built workspace packages to node_modules
 * This ensures the latest builds are available to dependent packages
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules", "@integralrsg");

const PACKAGES = [
  { name: "imath", source: "iMath" },
  { name: "igraph", source: "iGraph" },
  { name: "igsdof", source: "iGSDOF" },
  { name: "iuicomponents", source: "iUIComponents" },
];

console.log("📦 Syncing workspace builds to node_modules...\n");

// Ensure @integralrsg directory exists
if (!fs.existsSync(NODE_MODULES)) {
  fs.mkdirSync(NODE_MODULES, { recursive: true });
}

PACKAGES.forEach(({ name, source }) => {
  const sourcePath = path.join(ROOT, source);
  const distPath = path.join(sourcePath, "dist");
  const packageJsonPath = path.join(sourcePath, "package.json");
  const target = path.join(NODE_MODULES, name);

  // Check if source has a dist folder
  if (!fs.existsSync(distPath)) {
    console.log(`⏭️  Skipping ${name}: no dist folder found`);
    return;
  }

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`⚠️  Skipping ${name}: package.json not found`);
    return;
  }

  // Remove existing target if it's a directory (not a symlink)
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);
    if (!stats.isSymbolicLink()) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`  Removed old directory: ${name}`);
    } else {
      console.log(
        `  Found symlink for ${name}, skipping copy (symlink is better)`
      );
      return;
    }
  }

  // Create target directory
  fs.mkdirSync(target, { recursive: true });

  // Copy dist folder
  copyRecursive(distPath, path.join(target, "dist"));

  // Copy package.json
  fs.copyFileSync(packageJsonPath, path.join(target, "package.json"));

  console.log(`✓ Synced ${name} (dist + package.json)`);
});

console.log("\n✅ Workspace builds synced!\n");
console.log(
  "💡 Tip: Use symlinks (npm run setup-links) for auto-sync during development."
);

/**
 * Recursively copy directory contents
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
