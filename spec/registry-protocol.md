# Registry Protocol

Clients read a registry from:

- `GET {registryUrl}/index.json`

Then install by fetching each package path in index entries.

## Index Schema

```ts
interface RegistryIndex {
  version: number
  generated_at: string
  source: string
  apps: RegistryEntry[]
}

interface RegistryEntry {
  slug: string
  name: string
  version: string
  author: string
  description: string
  type: "automation" | "skill" | "mcp" | "extension"
  format: "yaml" | "bundle"
  path: string
  download_url?: string
  size_bytes?: number
  checksum?: string
  category: string
  tags: string[]
  icon?: string
  locale?: string
  min_app_version?: string
  requires_mcps?: string[]
  requires_skills?: string[]
  created_at?: string
  updated_at?: string
  /**
   * Locale-specific overrides for name and description.
   * Extracted from the spec's top-level i18n block at build time.
   * Allows the store UI to show translated listings without fetching the full spec.
   *
   * Keys are BCP 47 locale tags (e.g. "zh-CN", "ja").
   * Only name and description are included here; full config_schema overrides
   * are available only in the complete spec.
   *
   * Resolution order: exact locale match → language-prefix match → fallback to
   * canonical name/description.
   */
  i18n?: Record<string, { name?: string; description?: string }>
}
```

