# Contributing

## Add a New Digital Human

1. Create `packages/digital-humans/<slug>/spec.yaml`.
2. Ensure `spec.yaml` is valid JSON-compatible YAML and includes required AppSpec fields.
3. Set `store.slug` to match the bundle directory `<slug>`.
4. Run:

```bash
node scripts/build-index.mjs
```

5. Open a pull request.

## Required Store Metadata

Each package should include:

- `store.slug`
- `store.category`
- `store.tags`
- `store.locale`
- `store.min_app_version`
- `store.license`

## Category Values

Use one of:

- `shopping`
- `news`
- `content`
- `dev-tools`
- `productivity`
- `data`
- `social`
- `other`
