#!/usr/bin/env node
import fs from "fs";
import path from "path";

/** Convert kebab-case → camelCase */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Extract all class names from CSS file */
function extractCssClasses(cssContent) {
  const regex = /\.([a-zA-Z0-9-_]+)\s*\{/g;
  const classes = [];
  let match;
  while ((match = regex.exec(cssContent))) {
    classes.push(match[1]);
  }
  return classes;
}

/** Main function */
function checkCssUsage(cssFilePath) {
  if (!fs.existsSync(cssFilePath)) {
    console.error(`❌ File not found: ${cssFilePath}`);
    process.exit(1);
  }

  const cssContent = fs.readFileSync(cssFilePath, "utf8");
  const cssClasses = extractCssClasses(cssContent);
  const camelClasses = cssClasses.map(kebabToCamel);

  // assume matching .tsx file with same basename
  const baseName = path.basename(cssFilePath, path.extname(cssFilePath));
  const tsxFile = path.join(path.dirname(cssFilePath), `${baseName.replace(".module", "")}.tsx`);

  if (!fs.existsSync(tsxFile)) {
    console.error(`⚠️  No matching TSX file found: ${tsxFile}`);
    console.log("Printing all class names instead:\n");
    console.log(camelClasses.join("\n"));
    return;
  }

  const tsxContent = fs.readFileSync(tsxFile, "utf8");

  const used = [];
  const unused = [];

  for (const cls of camelClasses) {
    const pattern = new RegExp(`\\b(?:styles|appCss)\\.${cls}\\b`, "g");
    if (pattern.test(tsxContent)) {
      used.push(cls);
    } else {
      unused.push(cls);
    }
  }

  console.log(`📄 CSS file: ${path.basename(cssFilePath)}`);
  console.log(`🧩 TSX file: ${path.basename(tsxFile)}\n`);
  console.log(`✅ Used classes (${used.length}):`);
  console.log(used.map((c) => `  • ${c}`).join("\n") || "  None");

  console.log(`\n🚫 Unused classes (${unused.length}):`);
  console.log(unused.map((c) => `  • ${c}`).join("\n") || "  None");
}

/** CLI entry */
if (process.argv.length < 3) {
  console.log("Usage:");
  console.log("  node check-css-usage.mjs <css-file>");
  process.exit(0);
}

const cssFile = path.resolve(process.argv[2]);
checkCssUsage(cssFile);
