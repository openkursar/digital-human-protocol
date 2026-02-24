# Digital Human Protocol

Open registry and distribution format for digital humans (automation apps) used by Halo App Store.

## Registry URL

- Base URL: `https://openkursar.github.io/digital-human-protocol`
- Index URL: `https://openkursar.github.io/digital-human-protocol/index.json`

Halo clients fetch `index.json` first, then fetch package files by each entry path.

## Repository Layout

- `spec/`: protocol and registry docs
- `packages/digital-humans/`: installable app specs (`.yaml` files)
- `examples/`: learning examples (not indexed)
- `scripts/build-index.mjs`: builds `index.json` from `packages/`
- `.github/workflows/`: validation and Pages deployment

## Publish Flow

1. Add or update package specs under `packages/digital-humans/`.
2. Run `node scripts/build-index.mjs`.
3. Commit and merge to `main`.
4. `deploy.yml` rebuilds `index.json` and deploys GitHub Pages.

## Local Validation

```bash
node scripts/build-index.mjs
node scripts/build-index.mjs --check --source=https://openkursar.github.io/digital-human-protocol
```

## Current Scope

Phase 1 indexes only `format: "yaml"` packages for `type: automation`.
