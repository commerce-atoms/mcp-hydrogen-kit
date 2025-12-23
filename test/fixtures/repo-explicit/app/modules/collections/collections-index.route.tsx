import { json, type LoaderFunctionArgs } from 'react-router';
import { collectionsQuery } from './graphql/collections.gql';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const first = parseInt(url.searchParams.get('first') || '10');

  const response = await fetch(process.env.STOREFRONT_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': process.env.STOREFRONT_API_TOKEN!,
    },
    body: JSON.stringify({
      query: collectionsQuery,
      variables: { first },
    }),
  });

  const data = await response.json();
  return json({ collections: data.data.collections });
}

export default function CollectionsView({ data }: { data: { collections: unknown } }) {
  return <div>Collections: {JSON.stringify(data.collections)}</div>;
}

