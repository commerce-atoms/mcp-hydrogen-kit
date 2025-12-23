# Claude Desktop Integration

This guide shows how to register the MCP Hydrogen Kit server in Claude Desktop.

## Setup

1. **Install dependencies** (if using from source):

```bash
cd mcp-hydrogen-kit
npm install
npm run build
```

2. **Configure Claude Desktop**

Open Claude Desktop settings. The MCP configuration file location depends on your OS:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the MCP server configuration:

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

3. **Restart Claude Desktop** to load the MCP server.

## Available Tools

The same four tools are available as in Cursor:

- `codebase.routes.list` - List routes from the route manifest
- `codebase.file.outline` - Get file structure (imports, exports, symbols)
- `storefront.schema.lookup` - Lookup GraphQL schema types and fields
- `architecture.graphql.validatePlacement` - Validate query placement

See [cursor.md](./cursor.md) for detailed tool documentation and examples.

## Troubleshooting

- **Server not appearing**: Check Claude Desktop logs for errors
- **Permission errors**: Ensure the paths are absolute and accessible
- **Schema not loading**: Verify the schema file path is correct and the file is readable

