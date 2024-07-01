

/**
 * Article pricing discount data. Fields:
 * - `minimumQuantity` The minimum quantity of article aceesses that must be purchased
 * for the discount to be applied. Must be an integer greater than or equal to 2.
 * - `discountPercentage` The percentage discount to apply. Must be greater than 0 and less than 100.
 * Fractions are allowed.
 */
export type ArticlePricingDiscountData = {
  minimumQuantity: number;
  discountPercentage: number;
};

/**
 * Article pricing data. Fields:
 * - `price` The base unit price of the article, in U.S. cents. Must be an integer greater than 0.
 * - `discounts` The article pricing discounts. Each discount's `discountPercentage` must be
 * greater than the previous discount's `discountPercentage`, sorted by `minimumQuantity`.
 */
export type ArticlePricingData = {
  price: number;
  discounts?: ArticlePricingDiscountData[];
};

/**
 * Publication data returned from the API. Fields:
 * - `id` The LinketySplit publication ID
 * - `name` The publication's name
 * - `organizationName` The organization's name
 * - `verifiedDomains` The publication's verified domain fqdns.
 * - `defaultPricing` The publication's default pricing
 */
export type PublicationData = {
  id: string;
  name: string;
  organizationName: string;
  verifiedDomains: string[];
  defaultPricing: ArticlePricingData;
};

/**
 * Article data returned from the API, representing what LinketySplit
 * currently knows about an article.
 *
 * Fields:
 * - `id` The LinketySplit article ID
 * - `publicationId` The LinketySplit publication ID
 * - `permalink` The article's permalink (canonical URL)
 *
 * The fields below are derived from the article's `<meta>` tags:
 * - `enabled` Whether LinketySplit purchases are allowed for the article.
 * This will be false if the `linketysplit:enabled` meta tag is not present,
 * or the content attribute is not `true`.
 * - `pricing` The pricing currently assigned to the article (this
 * will be the publication's default pricing if the `linketysplit:pricing`
 * meta tag is not present.)
 * - `title` The article's title
 * - `description` The article's description
 * - `publishedAt` When the article was published
 * - `image` The article's image URL (or null, if we didn't find a matching meta tag)
 *
 */
export type ArticleData = {
  id: string;
  publicationId: string;
  enabled: boolean;
  pricing: ArticlePricingData;
  title: string;
  description: string;
  permalink: string;
  publishedAt: Date;
  image: string | null;
};

/**
 * Reader data returned from the API. Fields:
 * - `id` The reader's LinketySplit user ID
 * - `name` The reader's full name
 * - `profileImageUrl` The reader's profile image (or null, if they don't have one)
 */
export type ReaderData = {
  id: string;
  name: string;
  profileImageUrl: string | null;
};

/**
 * The data returned from verifying an article access link. if `grantAccess` is `true`,
 * then the access link is valid, and the reader should be shown the full article. Specifically,
 * it means:
 * - That the link originated with LinketySplit
 * - That the link has not been used before -- access links are only valid once
 * - That the reader has access to the article, either via purchasing it for
 * themselves or clicking on a share link.
 *
 * If `grantAccess` is `true`, then the following fields will be present:
 * - `reader` The current reader.
 * - `purchaser` The reader who purchased the article. This may be different from `reader`,
 * if the reader has access to the article via a share link.
 * - `articleId` The LinketySplit article ID.
 * - `purchaseId` The LinketySplit purchase ID.
 *
 * If `grantAccess` is `false`, then the following fields will be present:
 * - `error` An error message explaining why the access link is invalid.
 */
export type ArticleAccessData<GrantAccess extends boolean = boolean> = {
  articleAccessId: string;
  grantAccess: GrantAccess;
} & (GrantAccess extends true
  ? {
      reader: ReaderData;
      purchaser: ReaderData;
      articleId: string;
      purchaseId: string;
    }
  : {
      error: string;
    });

/**
 * A successful response returned from GET /api/v1/publication
 */
export type PublicationResponse = {
  publication: PublicationData;
};

/**
 * A successful response returned from
 * - GET /api/v1/publication/article/{permalink} (getting an article)
 * - POST /api/v1/publication/article (upserting an article)
 */
export type ArticleResponse = {
  publication: PublicationData;
  article: ArticleData;
};

/**
 * The response returned from POST /api/v1/publication/verify-article-access
 */
export type VerifyArticleAccessResponse = {
  publication: PublicationData;
  articleAccess: ArticleAccessData;
};


/**
 * The data inside of the JWT in an article purchase URL created by the SDK.
 */
export type ArticlePurchaseUrlPayload =  {
  permalink: string;
  customPricing?: ArticlePricingData;
  showSharingContext?: boolean;
}