import { ApiCallError } from './api-call-error.ts';
import type {
  ArticlePricingData,
  ArticlePurchaseUrlPayload,
  VerifyArticleAccessResponse
} from './types.ts';
import { SignJWT } from 'npm:jose'


export class PublicationSDK {
  static readonly ORIGIN = 'https://linketysplit.com';
  static readonly API_PATH = 'api/v1/publication';
  static readonly PURCHASE_LINK_PATH = 'purchase-link';
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
      permalink: PublicationSDK.validateArticlePermalink(permalink)
    };
    if (customPricing) {
      payload.customPricing =
        PublicationSDK.validateArticlePricing(customPricing);
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
    return [PublicationSDK.ORIGIN, PublicationSDK.API_PATH, jwt].join('/');
  }

  /**
   * Validates the given article permalink. Permalinks must be:
   * - canonical URLs, i.e. without any query parameters, user/password, query strings. or hash fragments
   * - secure (https://)
   *
   * @param {string|URL} permalink - The permalink to validate.
   * @return {string} The validated permalink as a string.
   * @throws {Error} If the permalink is not a valid canonical URL.
   */
  public static validateArticlePermalink(permalink: string|URL): string {
    let url: URL;
    try {
      url = new URL(permalink);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error('Permalink is not valid.');
    }
    if (url.protocol !== 'https:') {
      throw new Error('Permalink must use "https://"');
    }
    if (url.search || url.hash || url.username || url.password) {
      throw new Error('Permalink must not contain any query parameters, user/password, query strings, or hash fragments');
    }
    return url.toString();
  }


  
  /**
   * Validates the given article pricing data.
   * 
   * - `price` must be an integer greater than 0
   * - `discounts` must be an array of objects with `minimumQuantity` and `discountPercentage`
   * - each `discount` `discountPercentage` must be greater than the previous `discountPercentage`
   *
   * @param {ArticlePricingData} pricing - The pricing data to validate.
   * @return {ArticlePricingData} The validated pricing data.
   * @throws {Error} If the pricing data is invalid.
   */
  public static validateArticlePricing(
    pricing: ArticlePricingData
  ): ArticlePricingData {
    const { price } = pricing;
    if (Number.isNaN(price) || !Number.isInteger(price) || price <= 0) {
      throw new Error('Price must be an integer greater than 0.');
    }
    const data: Required<ArticlePricingData> = {
      price,
      discounts: []
    };
    const rawDiscounts = Array.isArray(pricing.discounts)
      ? pricing.discounts
      : [];

    for (let i = 0; i < rawDiscounts.length; i++) {
      const discount = rawDiscounts[i];
      const { discountPercentage, minimumQuantity } = discount;
      if (
        Number.isNaN(minimumQuantity) ||
        !Number.isInteger(minimumQuantity) ||
        minimumQuantity < 2
      ) {
        throw new Error(
          'Minimum quantity must be an integer greater than or equal to 2.'
        );
      }

      if (
        Number.isNaN(discountPercentage) ||
        discountPercentage <= 0 ||
        discountPercentage >= 100
      ) {
        throw new Error(
          'Discount percentage must be a number greater than 0 and less than 100.'
        );
      }
      data.discounts.push({
        minimumQuantity,
        discountPercentage
      });
    }
    data.discounts.sort((a, b) => a.minimumQuantity - b.minimumQuantity);
    for (let i = 0; i < data.discounts.length; i++) {
      const discount = data.discounts[i];
      const prevPct = i === 0 ? 0 : data.discounts[i - 1].discountPercentage;
      if (discount.discountPercentage <= prevPct) {
        throw new Error(
          `Each tier discount percentage must be greater than the previous tier's discount.`
        );
      }
    }
    return data;
  }

  
  /**
   * Make an API request to verify the access to an article using the provided access ID.
   *
   * @param {string} accessId - The ID of the article access to verify.
   * @return {Promise<VerifyArticleAccessResponse>} The verification result
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
      } catch (error) {
        // ignore
      }
      throw new ApiCallError(message, response.status, response.statusText);
    }
    return await response.json();
  }
}
