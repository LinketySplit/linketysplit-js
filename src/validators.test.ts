import {
  assertEquals,
  assertThrows,

} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  describe,
  it
} from 'https://deno.land/std@0.224.0/testing/bdd.ts';
import { validateArticlePricing, validateArticlePermalink } from './validators.ts';


describe('validateArticlePermalink', () => {
  it('throws if the permalink is empty', () => {
    assertThrows(() => {
      validateArticlePermalink('');
    });
  });
  it('throws if the permalink is insecure', () => {
    assertThrows(() => {
      validateArticlePermalink('http://example.com/article');
    });
  });
  it('throws if the permalink has hash', () => {
    assertThrows(() => {
      validateArticlePermalink(
        'https://example.com/article#foo'
      );
    });
  });
  it('throws if the permalink has query', () => {
    assertThrows(() => {
      validateArticlePermalink(
        'https://example.com/article?foo=bar'
      );
    });
  });
  it('throws if the permalink has port', () => {
    assertThrows(() => {
      validateArticlePermalink(
        'https://example.com:3000/article'
      );
    });
  });
  it('throws if the permalink has username password', () => {
    assertThrows(() => {
      validateArticlePermalink(
        'https://anonymous:flabada@example.com/article'
      );
    });
  });
});

describe('validateArticlePricing', () => {
  it('throws if the price is negative', () => {
    assertThrows(() => {
      validateArticlePricing({ price: -1 });
    });
  });
  it('throws if the price is nan', () => {
    assertThrows(() => {
      validateArticlePricing({ price: NaN });
    });
  });
  it('throws if the price is a float', () => {
    assertThrows(() => {
      validateArticlePricing({ price: 21.5 });
    });
  });
  it('throws if a discount minimum quantity is a float', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: 4.5, discountPercentage: 50 }]
      });
    });
  });
  it('throws if a discount minimum quantity is less than 2', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: 1, discountPercentage: 50 }]
      });
    });
  });
  it('throws if a discount minimum quantity is nan', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: NaN, discountPercentage: 50 }]
      });
    });
  });
  it('throws if a discount percentage is nan', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: 20, discountPercentage: NaN }]
      });
    });
  });
  it('throws if a discount percentage is 0', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: 20, discountPercentage: 0 }]
      });
    });
  });
  it('throws if a discount percentage is 100', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [{ minimumQuantity: 20, discountPercentage: 100 }]
      });
    });
  });
  it('throws if a discount quantities are not unique', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [
          { minimumQuantity: 20, discountPercentage: 5 },
          { minimumQuantity: 20, discountPercentage: 10 }
        ]
      });
    });
  });
  it('throws if a discount percentages do not rise with quantity', () => {
    assertThrows(() => {
      validateArticlePricing({
        price: 49,
        discounts: [
          { minimumQuantity: 10, discountPercentage: 5 },
          { minimumQuantity: 20, discountPercentage: 5 }
        ]
      });
    });
  });
  it('sorts discounts by minimum quantity', () => {
    const data =  validateArticlePricing({
      price: 49,
      discounts: [
        { minimumQuantity: 20, discountPercentage: 15 },
        { minimumQuantity: 10, discountPercentage: 5 },
        
      ]
    });
    assertEquals(data.discounts, [
      { minimumQuantity: 10, discountPercentage: 5 },
      { minimumQuantity: 20, discountPercentage: 15 },
    ])
  });
});
