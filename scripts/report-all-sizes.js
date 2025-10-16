import fs from "fs";
import path from "path";
import prettyBytes from "pretty-bytes";
import * as gzipSize from "gzip-size";

const root = path.resolve("./"); // scan root-level folders

// Scan all directories that have a "dist" folder
const dirs = fs.readdirSync(root).filter((dir) => {
  const distPath = path.join(root, dir, "dist");
  return fs.existsSync(distPath);
});

for (const dir of dirs) {
  const dist = path.join(root, dir, "dist");
  console.log(`\n📦 ${dir}`);
  console.log("------------------------------------------------------------");
  console.log("------------------------------------------------------------");

  let totalRaw = 0;
  let totalGzip = 0;

  // Skip irrelevant files
  const skipExtensions = [".map", ".tsbuildinfo"];

  for (const file of fs.readdirSync(dist)) {
    const full = path.join(dist, file);
    const stat = fs.statSync(full);
    const ext = path.extname(file);

    if (stat.isFile() && !skipExtensions.includes(ext)) {
      const buf = fs.readFileSync(full);
      const rawBytes = stat.size;
      const gzBytes = await gzipSize.gzipSize(buf);
      totalRaw += rawBytes;
      totalGzip += gzBytes;

      console.log(
        `${file.padEnd(25)} raw: ${prettyBytes(rawBytes).padEnd(10)} | gzip: ${prettyBytes(gzBytes)}`
      );
    }
  }

  console.log("------------------------------------------------------------");
  console.log(
    `🧮 Total for ${dir}: raw ${prettyBytes(totalRaw)} | gzip ${prettyBytes(totalGzip)}`
  );
}
