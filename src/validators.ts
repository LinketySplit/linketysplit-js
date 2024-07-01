import type { ArticlePricingData } from './types.ts';

/**
 * Validates the given article permalink. Permalinks must be:
 * - canonical URLs, i.e. without any query parameters, user/password, query strings. or hash fragments
 * - secure (https://)
 *
 * @param {string|URL} permalink - The permalink to validate.
 * @return {string} The validated permalink as a string.
 * @throws {Error} If the permalink is not a valid canonical URL.
 */
export const validateArticlePermalink = (permalink: string | URL): string => {
  let url: URL;
  try {
    url = new URL(permalink);
  } catch (_error) {
    throw new Error('Permalink is not valid.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Permalink must use "https://"');
  }
  if (url.search) {
    throw new Error('Permalink must not contain any query parameters');
  }
  if (url.port) {
    throw new Error('Permalink must not contain a port');
  }
  if (url.hash) {
    throw new Error('Permalink must not contain a hash fragment');
  }
  if (url.password || url.username) {
    throw new Error('Permalink must not contain a user/password');
  }

  return url.toString();
};
/**
 * Validates the given article pricing data.
 *
 * - `price` must be an integer greater than 0
 * - `discounts` must be an array of objects with `minimumQuantity` and `discountPercentage`
 * - each `discount` `discountPercentage` must be greater than the previous `discountPercentage`
 *
 * @param {ArticlePricingData} pricing - The pricing data to validate.
 * @return {Required<ArticlePricingData>} The validated pricing data, with the `discounts` array sorted.
 * @throws {Error} If the pricing data is invalid.
 */
export const validateArticlePricing = (
  pricing: ArticlePricingData
): Required<ArticlePricingData> => {
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
  // quantities must be unique
  const quantities = data.discounts.map((d) => d.minimumQuantity);
  if (new Set(quantities).size !== quantities.length) {
    throw new Error('Discount quantities must be unique.');
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
};
