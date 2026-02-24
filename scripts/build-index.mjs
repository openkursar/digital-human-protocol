#!/usr/bin/env node

import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, join, relative, sep } from "path";

const DEFAULT_SOURCE = "https://openkursar.github.io/digital-human-protocol";
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function toPosixPath(pathValue) {
  return pathValue.split(sep).join("/");
}

function parseArgs(argv) {
  let source = process.env.REGISTRY_SOURCE || DEFAULT_SOURCE;
  let check = false;

  for (const arg of argv) {
    if (arg === "--check") {
      check = true;
      continue;
    }

    if (arg.startsWith("--source=")) {
      const value = arg.slice("--source=".length).trim();
      if (value.length > 0) {
        source = value.replace(/\/+$/, "");
      }
    }
  }

  return { source, check };
}

function parseSpec(raw, relPath) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse ${relPath} as JSON-compatible YAML: ${String(error)}`
    );
  }
}

function mapSkillDependencyIds(skills) {
  if (!Array.isArray(skills)) return undefined;
  const ids = [];
  for (const item of skills) {
    if (typeof item === "string" && item.length > 0) {
      ids.push(item);
    } else if (item && typeof item === "object" && typeof item.id === "string" && item.id.length > 0) {
      ids.push(item.id);
    }
  }
  return ids.length > 0 ? ids : undefined;
}

function mapMcpDependencyIds(mcps) {
  if (!Array.isArray(mcps)) return undefined;
  const ids = mcps
    .map((item) => (item && typeof item === "object" ? item.id : undefined))
    .filter((id) => typeof id === "string" && id.length > 0);
  return ids.length > 0 ? ids : undefined;
}

function collectBundleFiles(bundleDir) {
  const files = [];
  const stack = [bundleDir];

  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function computeBundleStats(bundleDir, repoRoot) {
  const files = collectBundleFiles(bundleDir);
  const hash = createHash("sha256");
  let totalSize = 0;
  let latestMtimeMs = 0;

  for (const filePath of files) {
    const rel = toPosixPath(relative(repoRoot, filePath));
    const content = readFileSync(filePath);
    const fileStat = statSync(filePath);

    totalSize += fileStat.size;
    latestMtimeMs = Math.max(latestMtimeMs, fileStat.mtimeMs);

    hash.update(rel);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }

  return {
    sizeBytes: totalSize,
    checksum: `sha256:${hash.digest("hex")}`,
    updatedAt: latestMtimeMs > 0 ? new Date(latestMtimeMs).toISOString() : new Date().toISOString(),
  };
}

function discoverBundles(repoRoot, packagesRoot) {
  const results = [];
  const packageTypes = readdirSync(packagesRoot, { withFileTypes: true });

  for (const typeEntry of packageTypes) {
    if (!typeEntry.isDirectory()) continue;

    const typeDir = join(packagesRoot, typeEntry.name);
    const children = readdirSync(typeDir, { withFileTypes: true });

    for (const child of children) {
      const childPath = join(typeDir, child.name);

      if (child.isFile() && child.name.endsWith(".yaml")) {
        const rel = toPosixPath(relative(repoRoot, childPath));
        throw new Error(
          `Legacy single-file package detected at ${rel}. Use bundle directory format: packages/<type>/<slug>/spec.yaml`
        );
      }

      if (!child.isDirectory()) continue;

      const specPath = join(childPath, "spec.yaml");
      if (!existsSync(specPath)) {
        continue;
      }

      results.push({
        typeDirName: typeEntry.name,
        bundleDir: childPath,
        specPath,
      });
    }
  }

  return results.sort((a, b) => a.bundleDir.localeCompare(b.bundleDir));
}

function normalizeForCheck(index) {
  const clone = {
    ...index,
    generated_at: "",
    apps: Array.isArray(index.apps)
      ? index.apps.map((app) => ({ ...app, updated_at: "" }))
      : [],
  };
  return JSON.stringify(clone);
}

function buildIndex(repoRoot, source) {
  const packagesRoot = join(repoRoot, "packages");
  const bundles = discoverBundles(repoRoot, packagesRoot);
  const apps = [];

  for (const { bundleDir, specPath } of bundles) {
    const raw = readFileSync(specPath, "utf8");
    const specRelPath = toPosixPath(relative(repoRoot, specPath));
    const spec = parseSpec(raw, specRelPath);

    const bundleRelPath = toPosixPath(relative(repoRoot, bundleDir));
    const slugFromDir = basename(bundleDir);
    const store = spec.store && typeof spec.store === "object" ? spec.store : {};
    const slug = typeof store.slug === "string" && store.slug.length > 0 ? store.slug : slugFromDir;

    if (!SLUG_REGEX.test(slug)) {
      throw new Error(`Invalid slug "${slug}" in ${specRelPath}`);
    }

    if (slug !== slugFromDir) {
      throw new Error(
        `Slug mismatch in ${specRelPath}: store.slug=${slug} but bundle directory=${slugFromDir}`
      );
    }

    const bundleStats = computeBundleStats(bundleDir, repoRoot);

    const entry = {
      slug,
      name: typeof spec.name === "string" ? spec.name : slug,
      version: typeof spec.version === "string" ? spec.version : "0.0.0",
      author: typeof spec.author === "string" ? spec.author : "unknown",
      description: typeof spec.description === "string" ? spec.description : "",
      type: typeof spec.type === "string" ? spec.type : "automation",
      format: "bundle",
      path: bundleRelPath,
      size_bytes: bundleStats.sizeBytes,
      checksum: bundleStats.checksum,
      category: typeof store.category === "string" ? store.category : "other",
      tags: Array.isArray(store.tags) ? store.tags.filter((tag) => typeof tag === "string") : [],
      icon: typeof spec.icon === "string" ? spec.icon : undefined,
      locale: typeof store.locale === "string" ? store.locale : undefined,
      min_app_version: typeof store.min_app_version === "string" ? store.min_app_version : undefined,
      requires_mcps: mapMcpDependencyIds(spec.requires && spec.requires.mcps),
      requires_skills: mapSkillDependencyIds(spec.requires && spec.requires.skills),
      updated_at: bundleStats.updatedAt,
    };

    apps.push(entry);
  }

  apps.sort((a, b) => a.slug.localeCompare(b.slug));

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    source,
    apps,
  };
}

function main() {
  const repoRoot = process.cwd();
  const indexPath = join(repoRoot, "index.json");
  const { source, check } = parseArgs(process.argv.slice(2));

  const index = buildIndex(repoRoot, source);
  const nextContent = `${JSON.stringify(index, null, 2)}\n`;

  if (check) {
    let currentContent = "";
    try {
      currentContent = readFileSync(indexPath, "utf8");
    } catch {
      currentContent = "";
    }

    if (!currentContent) {
      process.stderr.write("index.json is missing. Run: node scripts/build-index.mjs\n");
      process.exit(1);
    }

    let current;
    try {
      current = JSON.parse(currentContent);
    } catch {
      process.stderr.write("index.json is invalid JSON. Run: node scripts/build-index.mjs\n");
      process.exit(1);
    }

    if (normalizeForCheck(current) !== normalizeForCheck(index)) {
      process.stderr.write("index.json is out of date. Run: node scripts/build-index.mjs\n");
      process.exit(1);
    }

    process.stdout.write(`[build-index] index.json is up to date (${index.apps.length} apps)\n`);
    return;
  }

  writeFileSync(indexPath, nextContent, "utf8");
  process.stdout.write(`[build-index] wrote index.json with ${index.apps.length} apps\n`);
}

main();
