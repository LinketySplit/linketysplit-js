import type {
  ArticlePricingData,
  ArticlePurchaseUrlPayload,
  ArticleResponse,
  PublicationResponse,
  VerifyArticleAccessResponse
} from './types.ts';
import { SignJWT } from 'npm:jose@5.6.2';
import type { fetch as FetchType } from 'npm:@types/node@18.11.18';
import { ApiCallError } from "../mod.ts";
/**
 * Tha main entrypoint for this library. Provides:
 * - a method to create a purchase URL for an article
 * - a method to inspect an article request URL to see if it is a LinketySplit article access URL
 * - access to the publication API endpoints
 */
export class PublicationSDK {
  protected static LINKETYSPLIT_ORIGIN = 'https://linketysplit.com';
  protected static PURCHASE_LINK_PATH = 'purchase-link';
  protected static PUBLICATION_API_PATH = 'api/v1/publication';
  protected static ARTICLE_ACCESS_LINK_PARAM = 'linketysplit_access';

  /**
   * Constructor for the PublicationSDK class.
   *
   * @param {string} publicationApiKey - The API key for the publication
   * @param {typeof FetchType} fetch - The fetch function to use for API calls, defaults to globalThis.fetch
   */
  constructor(
    public readonly publicationApiKey: string,
    public fetch: typeof FetchType = globalThis.fetch
  ) {
    
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
      permalink
    };
    if (customPricing) {
      payload.customPricing = customPricing
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
    return [PublicationSDK.LINKETYSPLIT_ORIGIN, PublicationSDK.PURCHASE_LINK_PATH, jwt].join('/');
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
  public async handleArticleRequestUrl(requestUrl: URL): Promise<VerifyArticleAccessResponse|null> {
    if (requestUrl.searchParams.has(PublicationSDK.ARTICLE_ACCESS_LINK_PARAM)) {
      const accessId = requestUrl.searchParams.get(PublicationSDK.ARTICLE_ACCESS_LINK_PARAM);
      if (accessId) {
        return await this.verifyArticleAccess(accessId);
      }
    }
    return null;
  }

  /**
   * Gets data for the publication identified by the API key.
   *
   * @returns {Promise<PublicationResponse>} The publication data
   */
  public async getPublication(): Promise<PublicationResponse> {
    return await this.makeApiRequest<PublicationResponse>([]);
  }

  /**
   * Retrieves an article with the specified permalink.
   *
   * @param {string} permalink - The permalink of the article to retrieve.
   * @return {Promise<ArticleResponse>} The response containing the requested article data.
   */
  public async getArticle(permalink: string): Promise<ArticleResponse> {
    return await this.makeApiRequest<ArticleResponse>(['article', permalink]);
  }

  /**
   * Upserts an article with the given permalink.
   *
   * @param {string} permalink - The permalink of the article.
   * @return {Promise<ArticleResponse>} - A promise that resolves to the response
   * containing the upserted article data.
   */
  public async upsertArticle(permalink: string): Promise<ArticleResponse> {
    return await this.makeApiRequest<ArticleResponse>(['article'], {
      permalink
    });
  }

  /**
   * Make an API request to verify the access to an article using the provided access ID.
   * Note that you should inspect the response data to check  `articleAccess.accessGranted`.
   * If `true`, the reader shold be shown the full article.
   *
   * @param {string} accessId - The ID of the article access to verify.
   * @return {Promise<VerifyArticleAccessResponse>} The verification result
   * @throws {ApiCallError} If the API call fails.
   */
  public async verifyArticleAccess(
    accessId: string
  ): Promise<VerifyArticleAccessResponse> {
    return await this.makeApiRequest<VerifyArticleAccessResponse>(
      ['verify-article-access'],
      { articleAccessId: accessId }
    );
  }

  /**
   * Makes an API request to the specified URL with the provided data.
   *
   * @param {string[]} slugs - The slugs that make up the path. Don't url encode -- this method handles that.
   * @param {Record<string, unknown>} [postData] - Optional. The data to send in the request body (if method is POST).
   * @return {Promise<T>} A promise that resolves to the response data in the specified type.
   * @throws {ApiCallError} If the API call fails.
   */
  public async makeApiRequest<T extends Record<string, unknown>>(
    slugs: string[],
    postData?: Record<string, unknown>
  ): Promise<T> {
    const parts = [
      PublicationSDK.LINKETYSPLIT_ORIGIN,
      PublicationSDK.PUBLICATION_API_PATH,
      ...slugs.map((slug) => encodeURIComponent(slug))
    ];
    const apiUrl = parts.join('/');
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
