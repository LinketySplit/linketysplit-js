import {
  assertEquals,
  assert,
  assertMatch,
  assertRejects
} from 'https://deno.land/std@0.224.0/assert/mod.ts';


import {
afterEach,
  beforeEach,
  describe,
  it
} from 'https://deno.land/std@0.224.0/testing/bdd.ts';
import { PublicationSDK } from './publication-sdk.ts';
import { jwtVerify } from 'npm:jose@5.6.2';

import {
  assertSpyCall,
  stub,
  resolvesNext,
  type Stub
} from 'https://deno.land/std@0.224.0/testing/mock.ts';
import { ARTICLE_ACCESS_LINK_PARAM } from './constants.ts';
import { VerifyArticleAccessResponse } from "./types.ts";

const apiKey = '0VaaIDZe1ctf6Nicbc0ohzTQtf7vZfCSJKSLjdCAAJ3n8AefiNyoD';

describe('PublicationSDK.createArticlePurchaseUrl', () => {
  let sdk: PublicationSDK;

  beforeEach(() => {
    sdk = new PublicationSDK(apiKey);
  });

  it('creates the link with the right path', async () => {
    const url = await sdk.createArticlePurchaseUrl(
      'https://example.com/article'
    );
    assert(url);
    assertMatch(url, /https:\/\/linketysplit\.com\/purchase-link/);
  });
  it('creates a jwt', async () => {
    const url = await sdk.createArticlePurchaseUrl(
      'https://example.com/article'
    );
    const jwt = url.split('/').pop();
    assert(jwt);
  });
  it('signs jwt with the api key', async () => {
    const url = await sdk.createArticlePurchaseUrl(
      'https://example.com/article'
    );
    const jwt = url.split('/').pop();
    assert(jwt);
    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(apiKey));
    assertEquals(payload.permalink, 'https://example.com/article');
  });
  it('validates the article permalink', async () => {
    await assertRejects(async () => {
      await sdk.createArticlePurchaseUrl('http://example.com/article', {
        price: NaN
      });
    });
  });
  it('validates the article pricing', async () => {
    await assertRejects(async () => {
      await sdk.createArticlePurchaseUrl('https://example.com/article', {
        price: NaN
      });
    });
  });
  it('includes custom pricing in the jwt', async () => {
    const url = await sdk.createArticlePurchaseUrl(
      'https://example.com/article',
      { price: 10 }
    );
    const jwt = url.split('/').pop();
    assert(jwt);
    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(apiKey));
    assertEquals(payload.customPricing, { price: 10, discounts: [] });
  });
  it('includes showSharingContext in the jwt', async () => {
    const url = await sdk.createArticlePurchaseUrl(
      'https://example.com/article',
      { price: 10 },
      true
    );
    const jwt = url.split('/').pop();
    assert(jwt);
    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(apiKey));
    assertEquals(payload.showSharingContext, true);
  });
});

describe('PublicationSDK.handleArticleRequestUrl ', () => {
  let sdk: PublicationSDK;
  let responseData: VerifyArticleAccessResponse;
  let requestStub: Stub;
  beforeEach(() => {
    sdk = new PublicationSDK(apiKey);
    responseData = {
      articleAccess: {
        articleId: 'bar',
        purchaser: {
          id: 'foo',
          name: 'foo',
          profileImageUrl: 'foo'
        },
        reader: {
          id: 'foo',
          name: 'foo',
          profileImageUrl: 'foo'
        },
        articleAccessId: 'foo',
        grantAccess: true,
        purchaseId: 'foo'
      },
      publication: {
        id: 'foo',
        name: 'foo',
        defaultPricing: { price: 10, discounts: [] },
        verifiedDomains: ['foo.com'],
        organizationName: 'foo'
      }
    };
    requestStub = stub(
      sdk.endpoints,
      'makeApiRequest',
      resolvesNext([responseData])
    );
  });
  afterEach(() => {
    requestStub.restore();
  });
  it('returns null if no article access ID is found in the URL', async () => {
    const url = new URL('https://example.com/article');
    const result = await sdk.handleArticleRequestUrl(url);
    assert(result === null);
  });
  it('returns null if the article access ID is empty', async () => {
    const url = new URL('https://example.com/article');
    url.searchParams.set(ARTICLE_ACCESS_LINK_PARAM, '');
    const result = await sdk.handleArticleRequestUrl(url);
    assert(result === null);
  });
  it('returns the response if the article access ID is found in the URL', async () => {
    const url = new URL('https://example.com/article');
    url.searchParams.set(ARTICLE_ACCESS_LINK_PARAM, 'foo');
    const result = await sdk.handleArticleRequestUrl(url);
    assert(result);
    assert(result === responseData);

  });

});
