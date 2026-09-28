import {
  catalogPage,
  categoryList,
  errorDto,
  orderDto,
  productDto,
  type CatalogPage,
  type CategoryDto,
  type CheckoutInput,
  type OrderDto,
  type ProductDto,
} from "@repo/shared/schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiUnavailableError extends Error {}
export class NotFoundError extends Error {}

/** A 4xx the API explained. `message` is safe to show the user as-is. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/*
  Responses are parsed with the shared schema, not cast to it.

  apps/api is a separate deployment and can be a version behind or ahead of this
  build. A cast would let a shape mismatch travel until something reads undefined
  three components deep, where the stack trace points at the render and not at the
  cause. Parsing fails here, naming the field.

  This is also the other half of what makes @repo/shared worth having: the exact
  object that validates the response on the server validates it again on the client.
*/
/*
  Per-call `next` controls Next's own server-side Data Cache and is independent of
  the API's response headers — apps/api sends Cache-Control: no-store on every
  product route regardless, which still governs a browser or proxy calling :3001
  directly. The two don't conflict; they cache different hops.

  Passing both `cache: "no-store"` and `next.revalidate` in the same call is
  rejected by Next, so a call either opts into a revalidate window via `next` or
  falls back to the always-live no-store default — never both.
*/
const request = async <T>(
  path: string,
  parse: (data: unknown) => T,
  init?: RequestInit & { next?: NextFetchRequestConfig },
): Promise<T> => {
  const { next, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, next ? { next, ...rest } : { cache: "no-store", ...rest });
  } catch (cause) {
    throw new ApiUnavailableError(`Could not reach the API at ${API_URL}`, { cause });
  }

  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) {
    // The API's error shape is itself a shared schema, so a 4xx body is parsed
    // rather than trusted — and anything that fails to parse is a plain failure.
    const body = errorDto.safeParse(await response.json().catch(() => null));
    if (body.success && response.status < 500) {
      throw new ApiError(response.status, body.data.error, body.data.message);
    }
    throw new Error(`${path} responded ${response.status}`);
  }
  return parse(await response.json());
};

/** Products per catalog page: the static first page and every page scrolled in after it. */
export const CATALOG_PAGE_SIZE = 15;

// A ~60s-stale price or stock badge on the grid is a normal e-commerce trade-off.
// It never reaches the trust boundary: ProductBuyBox re-fetches this same product
// live on mount, and checkout re-verifies server-side regardless.
export const fetchCatalog = (search: URLSearchParams): Promise<CatalogPage> =>
  request(`/products?${search.toString()}`, (data) => catalogPage.parse(data), {
    next: { revalidate: 60, tags: ["products"] },
  });

export const fetchProduct = (slug: string): Promise<ProductDto> =>
  request(`/products/${encodeURIComponent(slug)}`, (data) => productDto.parse(data), {
    next: { revalidate: 60, tags: ["products", `product:${slug}`] },
  });

export const fetchCategories = (): Promise<CategoryDto[]> =>
  request("/categories", (data) => categoryList.parse(data), {
    next: { revalidate: 60, tags: ["products"] },
  });

export const fetchOrder = (id: string): Promise<OrderDto> =>
  request(`/orders/${encodeURIComponent(id)}`, (data) => orderDto.parse(data));

export const placeOrder = (input: CheckoutInput): Promise<OrderDto> =>
  request("/orders", (data) => orderDto.parse(data), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

/** Cents to a display string. Money is integer cents everywhere until it is shown. */
export const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
