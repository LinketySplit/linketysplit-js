import {
  assertEquals,
  assert,
  assertRejects
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  assertSpyCall,
  stub,
  resolvesNext,
  type Stub
} from 'https://deno.land/std@0.224.0/testing/mock.ts';



import {
  afterEach,
  beforeEach,
  describe,
  it
} from 'https://deno.land/std@0.224.0/testing/bdd.ts';
import { PublicationApiEndpoints } from './publication-api-endpoints.ts';
import { MockFetch } from 'https://deno.land/x/deno_mock_fetch@1.0.1/mod.ts';
import { ApiCallError } from './api-call-error.ts';
import type { VerifyArticleAccessResponse } from "./types.ts";


const apiKey = '0VaaIDZe1ctf6Nicbc0ohzTQtf7vZfCSJKSLjdCAAJ3n8AefiNyoD';

describe('PublicationApiEndpoints.makeApiRequest', () => {
  let sdk: PublicationApiEndpoints;
  let mockFetch: MockFetch;
  beforeEach(() => {
    mockFetch = new MockFetch();
    sdk = new PublicationApiEndpoints(apiKey);
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

    const data = await sdk.makeApiRequest([]);
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

    const data = await sdk.makeApiRequest(['article'], { foo: 'bar' });

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
        await sdk.makeApiRequest([]);
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
        await sdk.makeApiRequest([]);
      },
      ApiCallError,
      'bar'
    );
  });
});

describe('PublicationApiEndpoints.verifyArticleAccess', () => {
  let sdk: PublicationApiEndpoints;
  let responseData: VerifyArticleAccessResponse;
  let requestStub: Stub
  beforeEach(() => {
    sdk = new PublicationApiEndpoints(apiKey);
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
