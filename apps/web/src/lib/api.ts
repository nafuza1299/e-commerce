import {
  catalogPage,
  categoryList,
  productDto,
  type CatalogPage,
  type CategoryDto,
  type ProductDto,
} from "@repo/shared/schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiUnavailableError extends Error {}

/*
  Responses are parsed with the shared schema, not cast to it.

  apps/api is a separate deployment and can be a version behind or ahead of this
  build. A cast would let a shape mismatch travel until something reads undefined
  three components deep, where the stack trace points at the render and not at the
  cause. Parsing fails here, naming the field.

  This is also the other half of what makes @repo/shared worth having: the exact
  object that validates the response on the server validates it again on the client.
*/
const request = async <T>(path: string, parse: (data: unknown) => T): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch (cause) {
    throw new ApiUnavailableError(`Could not reach the API at ${API_URL}`, { cause });
  }

  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  return parse(await response.json());
};

export class NotFoundError extends Error {}

export const fetchCatalog = (search: URLSearchParams): Promise<CatalogPage> =>
  request(`/products?${search.toString()}`, (data) => catalogPage.parse(data));

export const fetchProduct = (slug: string): Promise<ProductDto> =>
  request(`/products/${encodeURIComponent(slug)}`, (data) => productDto.parse(data));

export const fetchCategories = (): Promise<CategoryDto[]> =>
  request("/categories", (data) => categoryList.parse(data));

/** Cents to a display string. Money is integer cents everywhere until it is shown. */
export const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
