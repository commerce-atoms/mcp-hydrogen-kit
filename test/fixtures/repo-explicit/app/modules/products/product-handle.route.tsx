import { json, type LoaderFunctionArgs } from 'react-router';
import { getStorefrontApiUrl, getPrivateTokenHeaders } from '@platform/shopify';
import { productQuery } from './graphql/product.gql';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) {
    throw new Response('Not Found', { status: 404 });
  }

  const response = await fetch(getStorefrontApiUrl(), {
    method: 'POST',
    headers: getPrivateTokenHeaders(),
    body: JSON.stringify({
      query: productQuery,
      variables: { handle },
    }),
  });

  const data = await response.json();
  return json({ product: data.data.product });
}

export default function ProductView({ data }: { data: { product: unknown } }) {
  return <div>Product: {JSON.stringify(data.product)}</div>;
}

export type ProductLoaderData = Awaited<ReturnType<typeof loader>>;

