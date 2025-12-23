export const productQuery = `
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

