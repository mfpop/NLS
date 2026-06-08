import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
        email
        role
        plant
        department
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
      plant
      department
    }
  }
`;

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  plant: string;
  department: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredToken(): string | null {
  return localStorage.getItem("auth_token");
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Development bypass: set localStorage dev_bypass=true to skip login
  const devBypass = typeof window !== "undefined" && localStorage.getItem("dev_bypass") === "true";

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [fetchMe] = useLazyQuery(ME_QUERY);

  useEffect(() => {
    let cancelled = false;
    if (devBypass) {
      setUser({
        id: "1",
        username: "dev_user",
        email: "dev@example.com",
        role: "ADMIN",
        plant: "DEV_PLANT",
        department: "Engineering",
      });
      setInitialLoading(false);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setInitialLoading(false);
      return;
    }
    fetchMe().then((result) => {
      if (cancelled) return;
      const data = result.data as { me?: AuthUser } | undefined;
      if (data?.me) {
        setUser(data.me);
      } else {
        setStoredToken(null);
      }
      setInitialLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setStoredToken(null);
        setInitialLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const { data } = await loginMutation({
        variables: { input: { username, password } },
      });
      const result = data as { login?: { token: string; user: AuthUser } } | undefined;
      if (!result?.login) {
        return "Invalid credentials";
      }
      setStoredToken(result.login.token);
      setUser(result.login.user);
      return null;
    } catch {
      return "Login failed";
    }
  };

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: initialLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
