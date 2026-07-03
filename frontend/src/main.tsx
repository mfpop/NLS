import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/auth/AuthContext";
import { GRAPHQL_HTTP_URL } from "@/config";
import { AppRoutes } from "@/routes/AppRoutes";
import "@/styles/theme.css";
import "@/styles/app.css";

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("auth_token");
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      const msg = (err.message || "").toLowerCase();
      if (
        msg.includes("not authenticated") ||
        msg.includes("unauthorized") ||
        msg.includes("invalid token") ||
        msg.includes("token expired") ||
        msg.includes("signature has expired")
      ) {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
        return;
      }
    }
  }
});

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      DataManagementTreeChild: {
        keyFields: ["type", "id"],
      },
      DataManagementTreeRoot: {
        keyFields: ["type", "id"],
      },
      DataManagementOverview: {
        keyFields: false,
      },
    },
  }),
});

const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  </StrictMode>
);
