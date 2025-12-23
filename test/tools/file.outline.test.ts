import { describe, it, expect } from 'vitest';
import { parseFileOutline } from '../../src/internal/tsAst.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesRoot = resolve(__dirname, '../fixtures/repo-explicit');

describe('codebase.file.outline', () => {
  it('should extract imports, exports, and symbols from route file', async () => {
    const result = await parseFileOutline(
      fixturesRoot,
      'app/modules/products/product-handle.route.tsx'
    );

    expect(result.confidence).toBe('high');
    expect(result.outline.imports).toContain('react-router');
    expect(result.outline.imports).toContain('@platform/shopify');
    expect(result.outline.imports).toContain('./graphql/product.gql');

    expect(result.outline.exports.named).toContain('loader');
    expect(result.outline.exports.default).toBeDefined();

    expect(result.outline.symbols.functions).toContain('loader');
    expect(result.outline.symbols.types).toContain('ProductLoaderData');
  });

  it('should handle missing file gracefully', async () => {
    const result = await parseFileOutline(fixturesRoot, 'app/nonexistent.tsx');

    expect(result.confidence).toBe('low');
    expect(result.warnings).toBeDefined();
  });
});

