# linketysplit-js

Javascript/Typescript SDK to interact with LinketySplit.

## Installation

This package is published on
[JSR](https://jsr.io/@linketysplit/linketysplit-js).

```bash
# npm...
npx jsr add @linketysplit/linketysplit
# pnpm...
pnpm dlx jsr add @linketysplit/linketysplit-js
# yarn...
yarn dlx jsr add @linketysplit/linketysplit-js
# deno
deno add @linketysplit/linketysplit-js
# bun
bunx jsr add @linketysplit/linketysplit-js
```

## Usage

```ts
// import your API KEY, e.g
import { LINKETYSPLIT_API_KEY } from '$env/static/private';

// this library's main entrypoint...
import { PublicationSDK } from '@linketysplit/linketysplit-js';
const sdk = new PublicationSDK(LINKETYSPLIT_API_KEY);
```

Note this library uses `fetch`. If your platform does not have it natively, you should pass a 
a substitute to the constructor...
```ts
import fetch from 'node-fetch';
const sdk = new PublicationSDK(LINKETYSPLIT_API_KEY, fetch);
```

Same thing goes if you want to use a `fetch` implementation provided by your framework...
```ts
// SvelteKit +page.server.ts
export const load = async (event: PageServerLoadEvent) => {
  const sdk = new PublicationSDK(LINKETYSPLIT_API_KEY, event.fetch);
}
```

### Creating an article purchase URL

Article purchase URLs send a reader to our article purchase page. They include 
a JWT signed with your API key. The JWT contains:

- The article's permalink (canonical URL.)
- Optionally, custom pricing for a particular reader or situation.
- Optionally, whether you want the reader to be shown a "Share Article" screen rather than the
default "Purchase Article" screen. Use this flag when the reader already has access to the article,
either via subscription or other means (such as a LinketySplit purchase.)

```ts
const sdk = new PublicationSDK(LINKETYSPLIT_API_KEY);
const purchaseLink = await sdk.createArticlePurchaseUrl('https://leralyntimes.com/man-bites-dog');
// with custom pricing...
const customPricingLink = await sdk.createArticlePurchaseUrl(
  'https://leralyntimes.com/man-bites-dog',
  {
    price: 49,
    discounts: [
      {
        minimumQuantity: 5;
        discountPercentage: 7.5;
      },
      {
        minimumQuantity: 10;
        discountPercentage: 15;
      }
    ]
  }
);
// sharing...
const shareLink = await sdk.createArticlePurchaseUrl(
  'https://leralyntimes.com/man-bites-dog',
  undefined,
  true
);
```

