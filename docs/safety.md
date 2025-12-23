# Safety Model

This MCP server is designed to be **read-only** and safe to run locally in a repository.

## Security Guarantees

### Sandboxed File Reads

All file reads are restricted to an explicit `rootDir`:

- The server only reads files within the configured root directory
- Path traversal attempts (`../`) are rejected
- Symlink escapes are detected and prevented
- All paths are resolved and validated before access

### No Network Requests

- This project does not perform network requests
- Schema files must be provided locally (no remote fetching)
- No external API calls are made
- Note: This is a policy enforced by code review, not runtime sandboxing

### No Code Execution

- The server does not execute shell commands
- No code generation or file writes
- Pure read-only analysis only

### Deterministic Outputs

All tool outputs follow a consistent JSON envelope:

```json
{
  "ok": true|false,
  "data": {...},
  "error": {...},
  "confidence": "high"|"medium"|"low",
  "warnings": [...]
}
```

## Configuration

### Root Directory

Set the root directory via environment variable:

```bash
export MCP_ROOT_DIR=/path/to/hydrogen/project
```

If not set, defaults to `process.cwd()`.

### Schema Path

Provide the GraphQL schema file path:

```bash
export MCP_SCHEMA_PATH=/path/to/storefront.schema.graphql
```

`MCP_SCHEMA_PATH` points to the Storefront API schema (SDL or introspection JSON), not to application query files. Queries may be distributed across modules.
```

The schema is cached by file modification time to avoid redundant parsing.

## Error Handling

All errors are returned as structured responses with:

- `ok: false`
- `error.code`: Machine-readable error code
- `error.message`: Human-readable message
- `confidence`: Indicates reliability of the result

## Limitations

- Only reads files within `rootDir`
- Schema must be provided as a local GraphQL SDL file
- No support for remote schemas or introspection endpoints
- No file modification capabilities

