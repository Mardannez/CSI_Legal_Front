"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  clearAuthStorage,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "@/lib/auth-storage";

type EmpresaSession = {
  idEmpresa: number;
  nombre: string;
  idPais: number | null;
  pais: string | null;
  esPrincipal: boolean;
  roles: string[];
  permisos: string[];
};

type SessionData = {
  user: {
    id: number;
    usuario: string;
    nombreCompleto: string;
    correo: string | null;
    estado: number;
  };
  rolesGlobales: string[];
  permisosGlobales: string[];
  isGlobalAdmin: boolean;
  empresaActivaSugerida: {
    idEmpresa: number;
    nombre: string;
  } | null;
  empresas: EmpresaSession[];
  landingPage: string;
};

type LoginPayload = {
  usuario: string;
  password: string;
};

type AuthContextType = {
  token: string | null;
  session: SessionData | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  hasGlobalPermission: (permiso: string) => boolean;
  hasEmpresaPermission: (empresaId: number, permiso: string) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const currentToken = getStoredToken();

    if (!currentToken) {
      setToken(null);
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/auth/me");

      if (!response.ok) {
        clearAuthStorage();
        setToken(null);
        setSession(null);
        return;
      }

      const json = await response.json();
      const data: SessionData = json.data;

      setToken(currentToken);
      setSession(data);
      setStoredUser(data);
    } catch (error) {
      console.error("refreshSession error:", error);
      clearAuthStorage();
      setToken(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

function resolveFrontendLandingPage(sessionData: SessionData): string {
  const rawLandingPage = sessionData.landingPage || "/paises";

  if (rawLandingPage === "/paises") {
    return "/countries-selection";
  }

  const empresaDashboardMatch = rawLandingPage.match(/^\/empresas\/(\d+)\/dashboard$/);

  if (empresaDashboardMatch) {
    const companyId = empresaDashboardMatch[1];
    return `/company-dashboard?companyId=${companyId}`;
  }

  return rawLandingPage;
}


const login = useCallback(
  async ({ usuario, password }: LoginPayload) => {
    try {
      setLoading(true);

      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ usuario, password }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || "No se pudo iniciar sesión");
      }

      const newToken = json.token as string;

      setStoredToken(newToken);
      setToken(newToken);

      const meResponse = await apiFetch("/api/auth/me");
      const meJson = await meResponse.json();

      if (!meResponse.ok) {
        clearAuthStorage();
        setToken(null);
        setSession(null);
        throw new Error(meJson?.message || "No se pudo obtener la sesión");
      }

      const sessionData: SessionData = meJson.data;

      setSession(sessionData);
      setStoredUser(sessionData);

      router.push(resolveFrontendLandingPage(sessionData));
    } finally {
      setLoading(false);
    }
  },
  [router]
);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setSession(null);
    router.push("/login");
  }, [router]);

  const hasGlobalPermission = useCallback(
    (permiso: string) => {
      if (!session) return false;
      if (session.isGlobalAdmin) return true;
      return session.permisosGlobales.includes(permiso);
    },
    [session]
  );

  const hasEmpresaPermission = useCallback(
    (empresaId: number, permiso: string) => {
      if (!session) return false;
      if (session.isGlobalAdmin) return true;

      const empresa = session.empresas.find((e) => e.idEmpresa === empresaId);
      if (!empresa) return false;

      return empresa.permisos.includes(permiso);
    },
    [session]
  );

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser<SessionData>();

    if (storedToken) setToken(storedToken);
    if (storedUser) setSession(storedUser);

    refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      token,
      session,
      loading,
      login,
      logout,
      refreshSession,
      hasGlobalPermission,
      hasEmpresaPermission,
    }),
    [
      token,
      session,
      loading,
      login,
      logout,
      refreshSession,
      hasGlobalPermission,
      hasEmpresaPermission,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}