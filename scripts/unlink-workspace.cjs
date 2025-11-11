#!/usr/bin/env node

/**
 * Remove workspace symlinks from node_modules
 * This converts symlinks back to regular directories with copied builds
 * Useful for production builds or when symlinks cause issues
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules", "@integralrsg");

const PACKAGES = [
  { name: "imath", source: "iMath" },
  { name: "igsdof", source: "iGSDOF" },
  { name: "iuicomponents", source: "iUIComponents" },
];

console.log("🔓 Unlinking workspace packages...\n");

// Ensure @integralrsg directory exists
if (!fs.existsSync(NODE_MODULES)) {
  console.log("⚠️  No @integralrsg directory found in node_modules");
  process.exit(0);
}

let unlinkedCount = 0;

PACKAGES.forEach(({ name, source }) => {
  const target = path.join(NODE_MODULES, name);
  const sourcePath = path.join(ROOT, source);
  const distPath = path.join(sourcePath, "dist");
  const packageJsonPath = path.join(sourcePath, "package.json");

  // Check if target exists
  if (!fs.existsSync(target)) {
    console.log(`⏭️  Skipping ${name}: not found in node_modules`);
    return;
  }

  // Check if it's a symlink
  const stats = fs.lstatSync(target);
  if (!stats.isSymbolicLink()) {
    console.log(`⏭️  Skipping ${name}: already a regular directory`);
    return;
  }

  console.log(`  Unlinking ${name}...`);

  // Remove the symlink
  fs.rmSync(target, { recursive: true, force: true });

  // Check if source has a dist folder to copy
  if (!fs.existsSync(distPath)) {
    console.log(`⚠️  Warning: ${name} has no dist folder to copy`);
    return;
  }

  // Create regular directory and copy contents
  fs.mkdirSync(target, { recursive: true });

  // Copy dist folder
  copyRecursive(distPath, path.join(target, "dist"));

  // Copy package.json
  if (fs.existsSync(packageJsonPath)) {
    fs.copyFileSync(packageJsonPath, path.join(target, "package.json"));
  }

  console.log(`✓ Unlinked ${name} (copied dist + package.json)`);
  unlinkedCount++;
});

if (unlinkedCount === 0) {
  console.log("\n⚠️  No symlinks were found to unlink.");
} else {
  console.log(`\n✅ Unlinked ${unlinkedCount} package(s)!`);
  console.log(
    '\n💡 Tip: Run "npm run sync-builds" after building to update copies.'
  );
  console.log(
    '💡 Tip: Run "npm run setup-links" to restore symlinks for development.'
  );
}

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
