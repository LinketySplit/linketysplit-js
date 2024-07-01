import { ApiCallError } from '../mod.ts';
import { LINKETYSPLIT_ORIGIN, PUBLICATION_API_PATH } from './constants.ts';
import type {
  ArticleResponse,
  PublicationResponse,
  VerifyArticleAccessResponse
} from './types.ts';

/**
 * Endpoint accessors for the LinketySplit publication API.
 */
export class PublicationApiEndpoints {
  /**
   * Constructor for the PublicationApiEndpoints class.
   *
   * @param {string} publicationApiKey A publication API key
   * @param {typeof globalThis.fetch} fetch The fetch function to use for API
   * calls, defaults to globalThis.fetch
   */
  constructor(
    public readonly publicationApiKey: string,
    public fetch: typeof globalThis.fetch = globalThis.fetch
  ) {}

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
      LINKETYSPLIT_ORIGIN,
      PUBLICATION_API_PATH,
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
