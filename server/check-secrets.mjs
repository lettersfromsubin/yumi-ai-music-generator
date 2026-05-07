import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const ignoredDirs = new Set([".git", "node_modules", "dist", ".next", "generated"]);
const ignoredFiles = new Set(["package-lock.json"]);
const suspiciousPatterns = [
  {
    name: "Google API key",
    pattern: /AIza[0-9A-Za-z_-]{20,}/g
  },
  {
    name: "Committed ACEMusic API key assignment",
    pattern: /\bACEMUSIC_API_KEY\s*=\s*(?!replace_with_|your_|<|example|demo)[A-Za-z0-9_-]{16,}/gi
  },
  {
    name: "Committed Bearer token literal",
    pattern: /Authorization\s*[:=]\s*["'`]?Bearer\s+[A-Za-z0-9_-]{16,}/g
  }
];

const findings = [];

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
      continue;
    }

    if (!entry.isFile() || ignoredFiles.has(entry.name)) {
      continue;
    }

    await scanFile(fullPath);
  }
}

async function scanFile(filePath) {
  const relativePath = path.relative(projectRoot, filePath);

  if (relativePath === ".env.local" || relativePath === ".env") {
    return;
  }

  let content = "";

  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const { name, pattern } of suspiciousPatterns) {
    pattern.lastIndex = 0;

    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${relativePath}:${line} ${name}`);
    }
  }
}

await scanDirectory(projectRoot);

if (findings.length > 0) {
  console.error("Potential secret leakage found:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("No committed hosted music API keys found.");
