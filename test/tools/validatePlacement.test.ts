import { describe, it, expect } from 'vitest';
import { validatePlacement } from '../../src/tools/architecture.graphql.validatePlacement.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesRoot = resolve(__dirname, '../fixtures/repo-explicit');

describe('architecture.graphql.validatePlacement', () => {
  it('should pass when query is in same module as consumer', async () => {
    const result = await validatePlacement(
      fixturesRoot,
      'app/modules/products/product-handle.route.tsx',
      'app/modules/products/graphql/product.gql.ts',
      ['app/shared']
    );

    expect(result.status).toBe('pass');
    expect(result.owner.kind).toBe('module');
    expect(result.owner.name).toBe('products');
    expect(result.violations).toHaveLength(0);
    expect(result.confidence).toBe('high');
  });

  it('should fail when query is in different module', async () => {
    const result = await validatePlacement(
      fixturesRoot,
      'app/modules/products/product-handle.route.tsx',
      'app/modules/collections/graphql/collections.gql.ts',
      ['app/shared']
    );

    expect(result.status).toBe('fail');
    expect(result.owner.kind).toBe('module');
    expect(result.owner.name).toBe('products');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe('CROSS_MODULE_QUERY');
    expect(result.suggestedFixes).toHaveLength(1);
    expect(result.suggestedFixes[0]?.action).toBe('move');
    expect(result.confidence).toBe('high');
  });

  it('should fail when platform consumer uses module query', async () => {
    const result = await validatePlacement(
      fixturesRoot,
      'app/platform/routing/robots.route.ts',
      'app/modules/products/graphql/product.gql.ts',
      ['app/shared']
    );

    expect(result.status).toBe('fail');
    expect(result.owner.kind).toBe('platform');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe('PLATFORM_MODULE_QUERY');
    expect(result.confidence).toBe('high');
  });

  it('should warn when module uses shared query from allowlist', async () => {
    const result = await validatePlacement(
      fixturesRoot,
      'app/modules/products/product-handle.route.tsx',
      'app/shared/shared-query.gql.ts',
      ['app/shared']
    );

    expect(result.status).toBe('warn');
    expect(result.owner.kind).toBe('module');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe('SHARED_QUERY_WARNING');
    expect(result.confidence).toBe('medium');
  });
});

