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
}
```
