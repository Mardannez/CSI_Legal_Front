'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from './SearchBar';
import CompanyGrid from './CompanyGrid';
import CompanyTypeFilter from './CompanyTypeFilter';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  flagUrl: string;
  itemCount: number;
  compliancePercentage: number;
  companyType: string;
  logoUrl?: string;
}

interface ApiEmpresa {
  IdEmpresa: number;
  Empresa: string;
  Tipo: string | null;
  Descripcion: string | null;
  DescripcionActividades: string | null;
  IdPais: number;
  Pais: string;
  CantidadRequisitos: number;
}

const CompanyTypes = [
  'Todos',
  'Regulatorio',
  'Financiero',
  'Laboral',
  'Seguridad',
  'Ambiental',
  'Corporativo',
];

export default function CompanySelectionInteractive() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ==========================================================
  // 1) Sesión global desde AuthContext
  //    Aquí obtenemos:
  //    - session: usuario real logueado
  //    - logout: cierre de sesión centralizado
  //    - authLoading: estado de restauración de sesión
  // ==========================================================
  const { session, logout, loading: authLoading } = useAuth();

  // ==========================================================
  // 2) Query params normalizados
  //    Soportamos countryId/country para no romper enlaces viejos.
  // ==========================================================
  const selectedCountry =
    searchParams.get('countryId') || searchParams.get('country');

  // ==========================================================
  // 3) Estados locales de la pantalla
  // ==========================================================
  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ==========================================================
  // 4) Hidratar componente cliente
  // ==========================================================
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ==========================================================
  // 5) Guard de sesión
  //    Ya no revisamos localStorage manualmente.
  //    Esperamos a que AuthContext resuelva la sesión.
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    setAuthChecked(true);
  }, [isHydrated, authLoading, session, router]);

  // ==========================================================
  // 6) Usuario visual para UserContextMenu
  //    Ya no usamos mockUser.
  // ==========================================================
  const currentUser = useMemo(() => {
    const firstEmpresaRole =
      session?.empresas?.[0]?.roles?.join(', ') || 'Usuario';

    return {
      name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
      email: session?.user.correo || session?.user.usuario || '',
      role: session?.isGlobalAdmin ? 'SUPER_ADMIN' : firstEmpresaRole,
      avatar: '',
      isGlobalAdmin: !!session?.isGlobalAdmin, // <-- NUEVO
    };
  }, [session]);

  // ==========================================================
  // 7) Cargar empresas desde la API
  //    Importante:
  //    - admin verá todas o las del país seleccionado
  //    - usuario de empresa solo verá las asignadas por backend
  //    - el frontend ya no decide seguridad, solo consume
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;

    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const paisId =
          selectedCountry && /^\d+$/.test(selectedCountry)
            ? selectedCountry
            : null;

        const path = paisId
          ? `/api/empresas?paisId=${encodeURIComponent(paisId)}`
          : '/api/empresas';

        const res = await apiFetch(path, {
          method: 'GET',
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          throw new Error(json?.message || 'No se pudieron cargar las empresas');
        }

        const empresas: ApiEmpresa[] = Array.isArray(json?.Empresas)
          ? json.Empresas
          : [];

        const mapped: Company[] = empresas.map((e) => ({
          id: String(e.IdEmpresa),
          name: e.Empresa,
          countryCode: String(e.IdPais),
          countryName: e.Pais,
          flagUrl: '',
          itemCount: e.CantidadRequisitos ?? 0,
          compliancePercentage: 0,
          companyType: e.Tipo ?? 'Corporativo',
        }));

        setCompanies(mapped);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setLoadError(err?.message || 'Error cargando empresas');
          setCompanies([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [isHydrated, authChecked, selectedCountry]);

  // ==========================================================
  // 8) Filtro local de búsqueda y tipo
  //    La API ya filtra seguridad; aquí solo mejoramos UX.
  // ==========================================================
  const filteredCompanies = useMemo(() => {
    let filtered = [...companies];

    if (selectedCountry && /^\d+$/.test(selectedCountry)) {
      filtered = filtered.filter((c) => c.countryCode === selectedCountry);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.countryName.toLowerCase().includes(q)
      );
    }

    if (selectedType !== 'Todos') {
      filtered = filtered.filter((c) => c.companyType === selectedType);
    }

    return filtered;
  }, [companies, searchQuery, selectedType, selectedCountry]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
  };

  // ==========================================================
  // 9) Navegación a dashboard
  //    Ya usamos nombres consistentes con el dashboard nuevo:
  //    - companyId
  //    - countryId
  // ==========================================================
  const handleCompanySelect = (companyId: string) => {
    if (selectedCountry) {
      router.push(
        `/company-dashboard?countryId=${selectedCountry}&companyId=${companyId}`
      );
    } else {
      router.push(`/company-dashboard?companyId=${companyId}`);
    }
  };

  // ==========================================================
  // 10) Volver a países
  // ==========================================================
  const handleBackToCountries = () => {
    router.push('/countries-selection');
  };

  // ==========================================================
  // 11) Logout centralizado
  // ==========================================================
  const handleLogout = () => {
    logout();
  };

  // ==========================================================
  // 12) Loading inicial
  // ==========================================================
  if (!isHydrated || authLoading || !authChecked || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <AppImage
                  src="/assets/images/CSI-LOGO-05-1771034129124.png"
                  alt="CSISL Logo"
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </div>

              <UserContextMenu user={currentUser} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <div className="h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <AppImage
                src="/assets/images/CSI-LOGO-05-1771034129124.png"
                alt="CSISL Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>

            <UserContextMenu user={currentUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <BreadcrumbNavigation />

        <div className="mb-8">
          <button
            onClick={handleBackToCountries}
            className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <Icon name="ArrowLeftIcon" size={20} />
            <span>Volver a países</span>
          </button>

          <h2 className="text-3xl font-bold text-foreground mb-2">
            Selección de Empresas
          </h2>

          <p className="text-muted-foreground">
            {selectedCountry
              ? `Empresas de cumplimiento en ${
                  filteredCompanies[0]?.countryName || 'el país seleccionado'
                }`
              : 'Seleccione una empresa para gestionar requisitos y monitorear el progreso'}
          </p>
        </div>

        {loadError && (
          <div className="mb-6 bg-error/10 border border-error rounded-md p-4 flex items-start gap-3">
            <Icon
              name="ExclamationTriangleIcon"
              size={20}
              className="text-error flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-error font-caption">{loadError}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Buscar empresa o país..."
          />

          <CompanyTypeFilter
            types={CompanyTypes}
            selectedType={selectedType}
            onTypeSelect={handleTypeFilter}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredCompanies.length}{' '}
            {filteredCompanies.length === 1 ? 'empresa' : 'empresas'}
          </p>

          {(searchQuery || selectedType !== 'Todos') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('Todos');
              }}
              className="text-sm text-primary hover:text-primary/80 transition-smooth flex items-center gap-1"
            >
              <Icon name="XMarkIcon" size={16} />
              Limpiar filtros
            </button>
          )}
        </div>

        <CompanyGrid
          companys={filteredCompanies}
          onCompanySelect={handleCompanySelect}
        />
      </main>
    </div>
  );
}