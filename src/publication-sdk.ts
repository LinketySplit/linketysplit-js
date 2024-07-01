import type {
  ArticlePricingData,
  ArticlePurchaseUrlPayload,
  VerifyArticleAccessResponse
} from './types.ts';
import { SignJWT } from 'npm:jose@5.6.2';
import {
  validateArticlePermalink,
  validateArticlePricing
} from './validators.ts';
import { ORIGIN, PURCHASE_LINK_PATH, ARTICLE_ACCESS_LINK_PARAM } from './constants.ts';
import { PublicationApiEndpoints } from "./publication-api-endpoints.ts";

export class PublicationSDK {
  public readonly endpoints: PublicationApiEndpoints;
  /**
   * Constructor for the PublicationSDK class.
   *
   * @param {string} publicationApiKey - The API key for the publication
   * @param {typeof globalThis.fetch} fetch - The fetch function to use for API calls, defaults to globalThis.fetch
   */
  constructor(
    public readonly publicationApiKey: string,
    public fetch: typeof globalThis.fetch = globalThis.fetch
  ) {
    this.endpoints = new PublicationApiEndpoints(publicationApiKey, fetch);
  }

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
      payload.customPricing = validateArticlePricing(customPricing);
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
    return [ORIGIN, PURCHASE_LINK_PATH, jwt].join('/');
  }


  /**
   * Inspects an article request URL to see if it is a LinketySplit article access URL.
   * If the URL is an article access URL, this method verifies the reader's access to the article by
   * calling the `verifyArticleAccess` endpoint, and returns a `VerifyArticleAccessResponse` object.
   * 
   * Otherwise, it returns `null`.
   *
   * @param {URL} requestUrl The request URL.
   * @return {Promise<VerifyArticleAccessResponse|null>} A promise that resolves to the
   * VerifyArticleAccessResponse object if a LinketySplit article access ID is 
   * found in the URL, or null if not.
   */
  async handleArticleRequestUrl(requestUrl: URL): Promise<VerifyArticleAccessResponse|null> {
    if (requestUrl.searchParams.has(ARTICLE_ACCESS_LINK_PARAM)) {
      const accessId = requestUrl.searchParams.get(ARTICLE_ACCESS_LINK_PARAM);
      if (accessId) {
        return await this.endpoints.verifyArticleAccess(accessId);
      }
    }
    return null;
  }
}
