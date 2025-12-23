# Cursor Integration

This guide shows how to register the MCP Hydrogen Kit server in Cursor.

## Setup

1. **Install dependencies** (if using from source):

```bash
cd mcp-hydrogen-kit
npm install
npm run build
```

2. **Configure Cursor**

Open Cursor settings and add the MCP server configuration. In your Cursor settings file (typically `~/.cursor/mcp.json` or similar), add:

```json
{
  "mcpServers": {
    "hydrogen-kit": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-hydrogen-kit/dist/index.js"],
      "env": {
        "MCP_ROOT_DIR": "/path/to/your/hydrogen/project",
        "MCP_SCHEMA_PATH": "/path/to/storefront.schema.graphql"
      }
    }
  }
}
```

`MCP_SCHEMA_PATH` points to the Storefront API schema (SDL or introspection JSON), not to application query files. Queries may be distributed across modules.

Or if running from source with `tsx`:

```json
{
  "mcpServers": {
    "hydrogen-kit": {
      "command": "tsx",
      "args": ["/absolute/path/to/mcp-hydrogen-kit/src/index.ts"],
      "env": {
        "MCP_ROOT_DIR": "/path/to/your/hydrogen/project",
        "MCP_SCHEMA_PATH": "/path/to/storefront.schema.graphql"
      }
    }
  }
}
```

`MCP_SCHEMA_PATH` points to the Storefront API schema (SDL or introspection JSON), not to application query files. Queries may be distributed across modules.

3. **Restart Cursor** to load the MCP server.

## Available Tools

### `codebase.routes.list`

List all routes defined in the Hydrogen route manifest.

**When to use**: When you need to understand the routing structure or find which file handles a specific URL pattern.

**Example**:
```json
{
  "tool": "codebase.routes.list",
  "arguments": {
    "rootDir": "/path/to/hydrogen",
    "routesFile": "app/routes.ts"
  }
}
```

### `codebase.file.outline`

Get an outline of a TypeScript/TSX file (imports, exports, symbols) without returning file bodies.

**When to use**: When you need to understand a file's structure quickly or check what it exports.

**Example**:
```json
{
  "tool": "codebase.file.outline",
  "arguments": {
    "rootDir": "/path/to/hydrogen",
    "filePath": "app/modules/products/product-handle.route.tsx"
  }
}
```

### `storefront.schema.lookup`

Lookup Storefront API GraphQL schema types, fields, or search for types. Supports SDL (.graphql) and introspection JSON (.json) formats.

**When to use**: When you need to verify field names, arguments, or return types for Storefront API queries.

**Example**:
```json
{
  "tool": "storefront.schema.lookup",
  "arguments": {
    "rootDir": "/path/to/hydrogen",
    "schemaPath": "/path/to/storefront.schema.graphql",
    "typeName": "Product"
  }
}
```

### `architecture.graphql.validatePlacement`

Validate whether a GraphQL query file is placed correctly given the consumer file path.

**When to use**: When you need to ensure GraphQL queries follow module boundaries and architecture rules.

**Example**:
```json
{
  "tool": "architecture.graphql.validatePlacement",
  "arguments": {
    "rootDir": "/path/to/hydrogen",
    "consumerFilePath": "app/modules/products/product-handle.route.tsx",
    "queryFilePath": "app/modules/products/graphql/product.gql.ts"
  }
}
```

## Troubleshooting

- **Server not starting**: Check that the path to `index.js` is absolute and correct
- **File not found errors**: Verify `MCP_ROOT_DIR` points to your Hydrogen project root
- **Schema errors**: Ensure `MCP_SCHEMA_PATH` points to a valid GraphQL SDL file

