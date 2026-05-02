const DEFAULT_GRAPHQL_HTTP_URL = "/graphql/";

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export const GRAPHQL_HTTP_URL = withTrailingSlash(
  import.meta.env.VITE_GRAPHQL_URL ?? DEFAULT_GRAPHQL_HTTP_URL
);
