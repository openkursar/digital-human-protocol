# Package Format

## Phase 1

A package is a single `.yaml` file that follows AppSpec and contains optional store metadata.

Required AppSpec fields:

- `name`
- `version`
- `author`
- `description`
- `type`
- `system_prompt` (for `type: automation`)

Recommended store fields under `store`:

- `slug`
- `category`
- `tags`
- `locale`
- `min_app_version`
- `license`

## Future (Phase 2)

A package may be a folder bundle containing `spec.yaml` plus optional `skills/`, `mcps/`, and assets.
