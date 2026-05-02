/// <reference types="vite/client" />

interface ImportMetaEnv {
  // GraphQL-only endpoint configuration.
  readonly VITE_GRAPHQL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
