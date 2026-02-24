#!/usr/bin/env node

import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, join, relative, sep } from "path";

const DEFAULT_SOURCE = "https://openkursar.github.io/digital-human-protocol";
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function toPosixPath(pathValue) {
  return pathValue.split(sep).join("/");
}

function walkYamlFiles(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
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

function main() {
  const repoRoot = process.cwd();
  const packagesRoot = join(repoRoot, "packages");
  const indexPath = join(repoRoot, "index.json");
  const { source, check } = parseArgs(process.argv.slice(2));

  const packageFiles = walkYamlFiles(packagesRoot);
  const apps = [];

  for (const filePath of packageFiles) {
    const raw = readFileSync(filePath, "utf8");

    let spec;
    try {
      spec = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to parse ${toPosixPath(relative(repoRoot, filePath))} as JSON-compatible YAML: ${String(error)}`);
    }

    const relPath = toPosixPath(relative(repoRoot, filePath));
    const slugFromFilename = basename(filePath, ".yaml");
    const store = spec.store && typeof spec.store === "object" ? spec.store : {};
    const slug = typeof store.slug === "string" && store.slug.length > 0 ? store.slug : slugFromFilename;

    if (!SLUG_REGEX.test(slug)) {
      throw new Error(`Invalid slug \"${slug}\" in ${relPath}`);
    }

    const entry = {
      slug,
      name: typeof spec.name === "string" ? spec.name : slug,
      version: typeof spec.version === "string" ? spec.version : "0.0.0",
      author: typeof spec.author === "string" ? spec.author : "unknown",
      description: typeof spec.description === "string" ? spec.description : "",
      type: typeof spec.type === "string" ? spec.type : "automation",
      format: "yaml",
      path: relPath,
      size_bytes: statSync(filePath).size,
      checksum: `sha256:${createHash("sha256").update(raw).digest("hex")}`,
      category: typeof store.category === "string" ? store.category : "other",
      tags: Array.isArray(store.tags) ? store.tags.filter((tag) => typeof tag === "string") : [],
      icon: typeof spec.icon === "string" ? spec.icon : undefined,
      locale: typeof store.locale === "string" ? store.locale : undefined,
      min_app_version: typeof store.min_app_version === "string" ? store.min_app_version : undefined,
      requires_mcps: mapMcpDependencyIds(spec.requires && spec.requires.mcps),
      requires_skills: mapSkillDependencyIds(spec.requires && spec.requires.skills),
      updated_at: new Date(statSync(filePath).mtimeMs).toISOString(),
    };

    apps.push(entry);
  }

  apps.sort((a, b) => a.slug.localeCompare(b.slug));

  const index = {
    version: 1,
    generated_at: new Date().toISOString(),
    source,
    apps,
  };

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

    process.stdout.write(`[build-index] index.json is up to date (${apps.length} apps)\n`);
    return;
  }

  writeFileSync(indexPath, nextContent, "utf8");
  process.stdout.write(`[build-index] wrote index.json with ${apps.length} apps\n`);
}

main();
