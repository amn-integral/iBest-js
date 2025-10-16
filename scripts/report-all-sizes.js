import fs from "fs";
import path from "path";
import prettyBytes from "pretty-bytes";
import * as gzipSize from "gzip-size";

const root = path.resolve("./");

// helper to get all files recursively
function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(getAllFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const skipExtensions = [".map", ".tsbuildinfo"];

const dirs = fs.readdirSync(root).filter((dir) => {
  const distPath = path.join(root, dir, "dist");
  return fs.existsSync(distPath);
});

console.log("\n📦 Build Size Summary");
console.log("======================================================");

for (const dir of dirs) {
  const dist = path.join(root, dir, "dist");
  const files = getAllFiles(dist);

  let totalRaw = 0;
  let totalGzip = 0;

  for (const file of files) {
    const ext = path.extname(file);
    if (skipExtensions.includes(ext)) continue;

    const buf = fs.readFileSync(file);
    const stat = fs.statSync(file);

    totalRaw += stat.size;
    totalGzip += await gzipSize.gzipSize(buf);
  }

  console.log(
    `${dir.padEnd(20)} raw: ${prettyBytes(totalRaw).padEnd(10)} | gzip: ${prettyBytes(totalGzip)}`
  );
}

console.log("======================================================");
