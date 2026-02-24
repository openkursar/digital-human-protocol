# Digital Human Protocol

Open registry and distribution format for digital humans (automation apps) used by Halo App Store.

## Registry URL

- Base URL: `https://openkursar.github.io/digital-human-protocol`
- Index URL: `https://openkursar.github.io/digital-human-protocol/index.json`

Halo clients fetch `index.json` first, then fetch each bundle as `{path}/spec.yaml`.

## Repository Layout

- `spec/`: protocol and registry docs
- `packages/digital-humans/<slug>/spec.yaml`: installable bundle specs
- `examples/`: learning examples (not indexed)
- `scripts/build-index.mjs`: builds `index.json` from `packages/`
- `.github/workflows/`: validation and Pages deployment

## Bundle Rule

Bundle is the only package format.

- Minimum bundle: folder with `spec.yaml` only
- Extended bundle: may include `skills/`, `mcps/`, assets, and docs

## Publish Flow

1. Add or update bundle specs under `packages/digital-humans/<slug>/spec.yaml`.
2. Run `node scripts/build-index.mjs`.
3. Commit and merge to `main`.
4. `deploy.yml` rebuilds `index.json`; GitHub Pages publishes from `main`.

## Local Validation

```bash
node scripts/build-index.mjs
node scripts/build-index.mjs --check --source=https://openkursar.github.io/digital-human-protocol
```
