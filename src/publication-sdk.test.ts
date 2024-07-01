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
import { MockFetch } from 'https://deno.land/x/deno_mock_fetch@1.0.1/mod.ts';
import { ApiCallError, VerifyArticleAccessResponse } from '../mod.ts';

import {
  assertSpyCall,
  assertSpyCalls,
  spy,
  stub,
  resolvesNext,
  type Stub
} from 'https://deno.land/std@0.224.0/testing/mock.ts';

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

describe('PublicationSDK.makeApiRequest', () => {
  let sdk: PublicationSDK;
  let mockFetch: MockFetch;
  beforeEach(() => {
    mockFetch = new MockFetch();
    sdk = new PublicationSDK(apiKey);
  });
  afterEach(() => {
    mockFetch.close();
  });
  it('calls the right url', async () => {
    const url = 'https://linketysplit.com/api/v1/publication';
    const mockScope = mockFetch
      .intercept(url, { method: 'GET' })
      .response(JSON.stringify({ foo: 'bar' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    const data = await sdk.makeApiRequest(url);
    assertEquals(data.foo, 'bar');
    assert(mockScope.metadata.request.method === 'GET');
  });
  it('works if passed data', async () => {
    const url = 'https://linketysplit.com/api/v1/publication/article';
    const mockScope = mockFetch
      .intercept(url, { method: 'POST' })
      .response(JSON.stringify({ foo: 'bar' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    const data = await sdk.makeApiRequest(url, { foo: 'bar' });

    assertEquals(data.foo, 'bar');
    assert(mockScope.metadata.request.method === 'POST');
  });

  it('throws an error if the response is not ok', async () => {
    const url = 'https://linketysplit.com/api/v1/publication';
    mockFetch.intercept(url, { method: 'GET' }).response('', {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });

    await assertRejects(
      async () => {
        await sdk.makeApiRequest(url);
      },
      ApiCallError,
      'Unknown error.'
    );
  });
  it('throws returns the right error message', async () => {
    const url = 'https://linketysplit.com/api/v1/publication';
    mockFetch
      .intercept(url, { method: 'GET' })
      .response(JSON.stringify({ message: 'bar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });

    await assertRejects(
      async () => {
        await sdk.makeApiRequest(url);
      },
      ApiCallError,
      'bar'
    );
  });
});

describe('PublicationSDK.verifyArticleAccess', () => {
  let sdk: PublicationSDK;
  let responseData: VerifyArticleAccessResponse;
  let requestStub: Stub
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
   requestStub = stub(sdk, 'makeApiRequest', resolvesNext([responseData]));
  });
  afterEach(() => {
    requestStub.restore();
  })
  it('returns the right response', async () => {
    const data = await sdk.verifyArticleAccess('foo');
    assertEquals(data, responseData);
    assertSpyCall(requestStub, 0, {
      args: [
        'https://linketysplit.com/api/v1/publication/verify-article-access',
        { articleAccessId: 'foo' }]
    })
  });
});
