#!/usr/bin/env node

/**
 * Setup workspace symlinks for local development
 * This ensures all workspace packages are properly linked in node_modules
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

console.log("🔗 Setting up workspace symlinks...\n");

// Ensure @integralrsg directory exists
if (!fs.existsSync(NODE_MODULES)) {
  fs.mkdirSync(NODE_MODULES, { recursive: true });
  console.log("✓ Created @integralrsg directory");
}

PACKAGES.forEach(({ name, source }) => {
  const target = path.join(NODE_MODULES, name);
  const sourcePath = path.join(ROOT, source);

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Skipping ${name}: source directory ${source} not found`);
    return;
  }

  // Remove existing file/directory/symlink
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);
    if (stats.isSymbolicLink()) {
      console.log(`  Removing old symlink: ${name}`);
    } else {
      console.log(`  Removing old directory: ${name}`);
    }
    fs.rmSync(target, { recursive: true, force: true });
  }

  // Create symlink
  try {
    fs.symlinkSync(sourcePath, target, "junction"); // 'junction' works better on Windows
    console.log(`✓ Linked ${name} -> ${source}`);
  } catch (error) {
    console.error(`✗ Failed to link ${name}:`, error.message);
  }
});

console.log("\n✅ Workspace links setup complete!");
console.log(
  "\n💡 Tip: Run this script after installing dependencies or if packages aren't linking properly."
);
