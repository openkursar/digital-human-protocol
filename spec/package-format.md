# Package Format

## Canonical Package: Bundle

A package is always a bundle directory.

Minimum bundle shape:

```text
packages/<type>/<slug>/
  spec.yaml
```

This minimum bundle is equivalent to the old single-file package model but keeps
one canonical format for all future expansion.

## AppSpec Requirements

Required fields:

- `name`
- `version`
- `author`
- `description`
- `type`
- `system_prompt` (for `type: automation`)

Recommended `store` fields:

- `slug`
- `category`
- `tags`
- `locale`
- `min_app_version`
- `license`

## Extended Bundle (Future-safe)

Bundle may include optional directories:

- `skills/`
- `mcps/`
- `assets/`
- `README.md`

The install entrypoint remains `spec.yaml`.
