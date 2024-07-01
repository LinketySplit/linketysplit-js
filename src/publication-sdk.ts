import { ApiCallError } from './api-call-error.ts';
import type {
  ArticlePricingData,
  ArticlePurchaseUrlPayload,
  VerifyArticleAccessResponse
} from './types.ts';
import { SignJWT } from 'npm:jose@5.6.2';
import { validateArticlePermalink, validateArticlePricing } from "./validators.ts";

export class PublicationSDK {
  /** The origin of LinketySplit. */
  static readonly ORIGIN = 'https://linketysplit.com';
  /** The publication API path. */
  static readonly API_PATH = 'api/v1/publication';
  /** The purchase page path. */
  static readonly PURCHASE_LINK_PATH = 'purchase-link';
  /** Then search parameter name for an article access link. */
  static readonly ARTICLE_ACCESS_LINK_PARAM = 'linketysplit_access';

  /**
   * Constructor for the PublicationSDK class.
   *
   * @param {string} publicationApiKey - The API key for the publication
   * @param {typeof globalThis.fetch} fetch - The fetch function to use for API calls, defaults to globalThis.fetch
   */
  constructor(
    public readonly publicationApiKey: string,
    public fetch: typeof globalThis.fetch = globalThis.fetch
  ) {}

  /**
   * Creates a purchase URL for an article, pointing to the LinketySplit
   * article purchase page.
   *
   * @param {string} permalink Required.The permalink (canonical URL) of the article.
   * @param {ArticlePricingData} [customPricing] Optional. Custom pricing to show to
   * **this particular** reader. This overrides the pricing associated with the article
   * via the `linketysplit:pricing` meta tag.
   * @param {boolean} [showSharingContext] - Optional flag to indicate
   * that the reader should be shown a "Share this article" screen rather than the
   * default "Purchase this article" screen. Use this, for example, if the reader
   * already has access to the article via a subscription or LinketySplit share link.
   * @return {Promise<string>} The URL.
   */
  public async createArticlePurchaseUrl(
    permalink: string,
    customPricing?: ArticlePricingData,
    showSharingContext?: boolean
  ): Promise<string> {
    const payload: ArticlePurchaseUrlPayload = {
      permalink: validateArticlePermalink(permalink)
    };
    if (customPricing) {
      payload.customPricing =
        validateArticlePricing(customPricing);
    }
    if (showSharingContext === true) {
      payload.showSharingContext = true;
    }
    const encodedSecret = new TextEncoder().encode(this.publicationApiKey);
    const alg = 'HS256';
    const signer = new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt();
    const jwt = await signer.sign(encodedSecret);
    return [PublicationSDK.ORIGIN, PublicationSDK.PURCHASE_LINK_PATH, jwt].join('/');
  }

  

 
  /**
   * Make an API request to verify the access to an article using the provided access ID.
   *
   * @param {string} accessId - The ID of the article access to verify.
   * @return {Promise<VerifyArticleAccessResponse>} The verification result
   * @throws {ApiCallError} If the API call fails.
   */
  public async verifyArticleAccess(
    accessId: string
  ): Promise<VerifyArticleAccessResponse> {
    return await this.makeApiRequest<VerifyArticleAccessResponse>(
      [
        PublicationSDK.ORIGIN,
        PublicationSDK.API_PATH,
        'verify-article-access'
      ].join('/'),
      { articleAccessId: accessId }
    );
  }

  /**
   * Makes an API request to the specified URL with the provided data.
   *
   * @param {string} apiUrl - The URL of the API endpoint to make the request to.
   * @param {Record<string, unknown>} [postData] - Optional. The data to send in the request body (if method is POST).
   * @return {Promise<T>} A promise that resolves to the response data in the specified type.
   * @throws {ApiCallError} If the API call fails.
   */
  public async makeApiRequest<T extends Record<string, unknown>>(
    apiUrl: string,
    postData?: Record<string, unknown>
  ): Promise<T> {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${this.publicationApiKey}`);
    headers.set('Accept', 'application/json');
    let method = 'GET';
    let body: string | undefined = undefined;
    if (postData) {
      method = 'POST';
      body = JSON.stringify(postData);
      headers.set('Content-Length', body.length.toString());
      headers.set('Content-Type', 'application/json');
    }

    const response = await this.fetch(apiUrl, {
      method,
      headers,
      body
    });

    if (!response.ok) {
      let message = 'Unknown error.';
      try {
        const data = await response.json();
        if (
          data &&
          typeof data === 'object' &&
          typeof data.message === 'string'
        ) {
          message = data.message;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // ignore
      }
      throw new ApiCallError(message, response.status, response.statusText);
    }
    return await response.json();
  }
}
