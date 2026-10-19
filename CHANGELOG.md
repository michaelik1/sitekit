# Changelog

## 3.0.0

- File-based YAML routes and page-local media loaded at runtime from a mounted directory.
- Ten reusable blocks, optional metadata and covers, explicit or automatic collections.
- Strict versioned schemas, reference validation, Markdown sanitization, draft isolation and last-valid-snapshot caching.
- Removed R2/S3 integration, media sync/upload scripts, custom Markdown/YAML parsers and generated content indexes.
- Content-independent Docker image and simple read-only bind mount deployment.
- Operator content is ignored by Git; a neutral starter site lives in examples/content.
- Migrated the existing operator site locally to the new format.
