import { route } from '@react-router/node';

export const routes = [
  route('/products/:handle', 'app/modules/products/product-handle.route.tsx'),
  route('/collections/:handle', 'app/modules/collections/collections-index.route.tsx'),
  route('/robots.txt', 'app/platform/routing/robots.route.ts'),
];

