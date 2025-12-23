import { route } from '@react-router/node';

// Alternative route structure: routes wrapped in function
function createRoutes() {
  return [
    route('/products/:handle', 'app/modules/products/product-handle.route.tsx'),
    route('/collections/:handle', 'app/modules/collections/collections-index.route.tsx'),
    route('/robots.txt', 'app/platform/routing/robots.route.ts'),
  ];
}

export const routes = createRoutes();

