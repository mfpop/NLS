import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GRAPHQL_HTTP_URL } from "@/config";
import { AppRoutes } from "@/routes/AppRoutes";
import "@/styles/theme.css";
import "@/styles/app.css";

const client = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_HTTP_URL }),
  cache: new InMemoryCache(),
});

const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  </StrictMode>
);
