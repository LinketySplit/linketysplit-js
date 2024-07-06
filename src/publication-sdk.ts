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
  /**
   * The origin of LinketySplit.
   * Provided here for development purposes.
   */
  public static readonly ORIGIN: string = 'https://linketysplit.com';
  public static readonly PURCHASE_LINK_PATH = 'purchase-link';
  public static readonly PUBLICATION_API_PATH = 'api/v1/publication';
  public static readonly ARTICLE_ACCESS_LINK_PARAM = 'linketysplit_access';

  /**
   * Constructor for the PublicationSDK class.
   *
   * @param {string} publicationApiKey The API key for the publication
   * @param {typeof FetchType} fetch The fetch function to use for API calls, defaults to globalThis.fetch
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
    return [PublicationSDK.ORIGIN, PublicationSDK.PURCHASE_LINK_PATH, jwt].join('/');
  }

/**
 * Generates HTML meta tags based on the provided options.
 * 
 * The generated meta tags:
 * ```html
 * <!-- Always required if you want to enable LinketySplit purchases for this article -->
 * <meta name="linketysplit:enabled" content="true" /> 
 * 
 * <!-- Optional article pricing. If you do not include this tag, LinketySplit will use the publication's default pricing -->
 * <meta name="linketysplit:pricing" content="{&quot;price&quot;:100}" />
 * 
 * <!-- Required if you do not include an article:published_time meta tag elsewhere -->
 * <meta name="linketysplit:published_time" content="2024-07-06T16:06:19.431Z" />
 * 
 * <!-- Required if you do not include an og:title meta tag elsewhere -->
 * <meta name="linketysplit:title" content="The title of the article" />
 * 
 * <!-- Required if you do not include an og:description meta tag elsewhere -->
 * <meta name="linketysplit:description" content="The description of the article" />
 * 
 * <!-- Optional. You can also use an og:image meta tag -->
 * <meta name="linketysplit:image" content="https://example.com/image.png" />
 * 
 * ``` 
 * 
 * The only required key is `options.enabled`. the other keys are optional, as long as you 
 * include the corresponding `og:*` meta tag on the article page.
 *
 * @param {Object} options - The options for generating the meta tags.
 * @param {boolean} [options.enabled] - Required. Indicates whether LinketySplit purchases are currently enabled. 
 * @param {ArticlePricingData} [options.articlePricing] - Optional. The article's pricing. If not included, the publication's default pricing will be used.
 * @param {Date|string} [options.publishedTime] - Optional, but make sure  you include an article:published_time meta tag elsewhere. 
 * @param {string} [options.articleTitle] - The title of the article.
 * @param {string} [options.articleDescription] - The description of the article.
 * @param {string} [options.articleImage] - The image URL of the article.
 * @return {string} The generated HTML meta tags.
 */
  public getMetaTagHtml(options:{
    enabled: boolean;
    articlePricing?: ArticlePricingData;
    publishedTime?: Date|string;
    articleTitle?: string;
    articleDescription?: string;
    articleImage?: string;
  }): string {
    const metas: string[] = [
      `<meta property="linketysplit:enabled" content="${options.enabled? 'true': 'false'}" />`,
    ];
    if (options.publishedTime) {
      const d = new Date(options.publishedTime);
      metas.push(`<meta name="linketysplit:published_time" content="${d.toISOString()}" />`);
    }
    if (options.articlePricing) {
      const json = JSON.stringify(options.articlePricing).replaceAll(/"/g, '&quot;');
      metas.push(`<meta name="linketysplit:article_pricing" content="${json}" />`);
    }
    if (options.articleTitle) {
      metas.push(`<meta name="linketysplit:title" content="${options.articleTitle.replaceAll(/"/g, '&quot;')}" />`);
    }
    if (options.articleDescription) {
      metas.push(`<meta name="linketysplit:description" content="${options.articleDescription.replaceAll(/"/g, '&quot;')}" />`);
    }
    if (options.articleImage) {
      metas.push(`<meta name="linketysplit:image" content="${options.articleImage.replaceAll(/"/g, '&quot;')}" />`);
    }
    return metas.join('\n');
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
      PublicationSDK.ORIGIN,
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
