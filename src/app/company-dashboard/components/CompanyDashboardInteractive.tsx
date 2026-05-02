'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import KPICard from './KPICard';
import ComplianceChart from './ComplianceChart';
import ItemsTableFilters from './ItemsTableFilters';
import ItemsTable from './ItemsTable';
import NewItemModal from './NewItemModal';
import ItemDetailModal from './ItemDetailModal';
import RequisitosPickerModal from '@/components/modals/RequisitosPickerModal';
import { useAuth } from '@/context/AuthContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Mode = 'all' | 'selected';
type StatusOption = { id: number; label: string };

interface DashboardItem {
  id: number; // id de EvaluacionDetalle
  evaluacionId: number; // id de EvaluacionEncabezado
  requisitoId: number; // id de Requisito
  name: string;
  description: string;
  estadoId: number; // IdEstadoRequisito real
  status: string; // texto del estado
  responsible: string;
  plannedDate: string;
  periodicity: string;
  lastUpdate: string;

  // ==========================================================
  // CAMPOS DEL DETALLE DE EVALUACIÓN
  // Estos campos vienen desde EvaluacionDetalle. Los dejamos
  // opcionales para que la tabla y el modal puedan recibir tanto
  // el formato normalizado del front como los nombres crudos de API.
  // ==========================================================
  responsable?: string | null;
  fechaPlanificada?: string | null;
  idPeriocidad?: number | null;
  periocidad?: string | null;
  ultimaActualizacion?: string | null;
}

interface ChartSlice {
  name: string;
  value: number;
}

interface ActiveFilters {
  status: string;
  responsible: string;
  periodicity: string;
}

function formatDateES(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CompanyDashboardInteractive() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ==========================================================
  // 1) Parámetros de la URL
  //    Soportamos companyId/countryId, pero también dejamos
  //    compatibilidad con company/country por si queda algún link viejo.
  // ==========================================================
  const selectedCountry =
    searchParams.get('countryId') || searchParams.get('country');
  const selectedCompany =
    searchParams.get('companyId') || searchParams.get('company');

  // ==========================================================
  // 2) Sesión global del sistema
  //    Desde aquí leemos:
  //    - session: usuario actual + empresas + permisos
  //    - logout: cierre de sesión centralizado
  //    - hasEmpresaPermission: helper para decidir qué puede hacer
  //    - authLoading: carga inicial de sesión
  // ==========================================================
  const {
    session,
    logout,
    hasEmpresaPermission,
    loading: authLoading,
  } = useAuth();

  // ==========================================================
  // 3) Normalizamos el companyId actual
  //    Lo usamos para buscar permisos de empresa.
  // ==========================================================
  const selectedCompanyId = useMemo(() => {
    const n = Number(selectedCompany);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [selectedCompany]);

  // ==========================================================
  // 4) Buscamos la empresa actual dentro de la sesión
  //    Esto nos sirve para mostrar el rol correcto en el menú
  //    y para saber si el usuario realmente pertenece a esta empresa.
  // ==========================================================
  const currentEmpresa = useMemo(() => {
    if (!session || !selectedCompanyId) return null;

    return (
      session.empresas.find(
        (empresa) => empresa.idEmpresa === selectedCompanyId
      ) || null
    );
  }, [session, selectedCompanyId]);

  // ==========================================================
  // 5) Armamos el objeto visual del usuario para UserContextMenu
  //    Ya no usamos mockUser.
  // ==========================================================
  const currentUser = useMemo(
    () => ({
      name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
      email: session?.user.correo || session?.user.usuario || '',
      role: session?.isGlobalAdmin
        ? 'SUPER_ADMIN'
        : currentEmpresa?.roles?.join(', ') || 'Usuario',
      avatar: '',
    }),
    [session, currentEmpresa]
  );

  // ==========================================================
  // 6) Permisos por empresa
  //    Estos booleans controlan la UI:
  //    - lector: solo ve
  //    - editor/admin: puede operar
  // ==========================================================
  const canStartEvaluation = selectedCompanyId
    ? hasEmpresaPermission(selectedCompanyId, 'EVALUACIONES_EDITAR')
    : false;

  const canCreateNewElement = selectedCompanyId
    ? hasEmpresaPermission(selectedCompanyId, 'EVALUACIONES_EDITAR')
    : false;

  const canEditStatus = selectedCompanyId
    ? hasEmpresaPermission(selectedCompanyId, 'REQUISITOS_ESTADO_EDITAR')
    : false;

  // ==========================================================
  // GUARDAR CAMBIOS EN EVALUACIÓN
  // Este permiso controla la visibilidad del botón del encabezado.
  // Se usa EVALUACIONES_EDITAR porque este botón actualiza
  // EvaluacionEncabezado y no debe verlo el usuario Empresa_Lector.
  // ==========================================================
  const canSaveEvaluationChanges = selectedCompanyId
    ? hasEmpresaPermission(selectedCompanyId, 'EVALUACIONES_EDITAR')
    : false;

  // ==========================================================
  // 7) Estado base / auth
  // ==========================================================
  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ==========================================================
  // 8) Estado del dashboard
  // ==========================================================
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasEvaluation, setHasEvaluation] = useState<boolean>(true);
  const [evaluacion, setEvaluacion] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartSlice[]>([]);
  const [items, setItems] = useState<DashboardItem[]>([]);

  // ==========================================================
  // GUARDAR CAMBIOS EN EVALUACIÓN
  // Estado visual del botón que guarda el resumen del encabezado.
  // Cuando se presiona, el backend debe actualizar:
  // - EvaluacionEncabezado.UltimaVerificacion
  // - EvaluacionEncabezado.UltimoHistorico
  // - EvaluacionEncabezado.ProximoEvento
  // ==========================================================
  const [savingEvaluationChanges, setSavingEvaluationChanges] = useState(false);

  // ==========================================================
  // 9) Catálogo de estados
  // ==========================================================
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  // ==========================================================
  // 10) Estado para iniciar evaluación
  // ==========================================================
  const [mode, setMode] = useState<Mode>('all');
  const [selectedReqIds, setSelectedReqIds] = useState<number[]>([]);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  // ==========================================================
  // 11) Estado de tabla / filtros
  // ==========================================================
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    status: '',
    responsible: '',
    periodicity: '',
  });

  // ==========================================================
  // 12) Modales existentes
  // ==========================================================
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const itemsPerPage = 10;

  // ==========================================================
  // 13) Nombre de empresa para mostrar en pantalla
  // ==========================================================
  const [companyName, setCompanyName] = useState<string>('');
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false);

  const loadCompanyInfo = async () => {
    if (!selectedCompany || !/^\d+$/.test(selectedCompany)) return;

    const token = localStorage.getItem('CSI_Legal_token');
    const url = `${API_URL}/api/empresas/${encodeURIComponent(selectedCompany)}`;

    setCompanyInfoLoading(true);

    try {
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        setCompanyName(`ID: ${selectedCompany}`);
        return;
      }

      const nombre = json?.Empresa?.Nombre;
      setCompanyName(nombre ? String(nombre) : `ID: ${selectedCompany}`);
    } catch {
      setCompanyName(`ID: ${selectedCompany}`);
    } finally {
      setCompanyInfoLoading(false);
    }
  };

  // ==========================================================
  // 14) Hidratar componente cliente
  // ==========================================================
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ==========================================================
  // 15) Guard de sesión
  //    Aquí ya no dependemos solo del localStorage.
  //    Esperamos a que el AuthContext termine de revisar la sesión.
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
  // 16) Cargar catálogo de estados
  //    Aunque el lector no edite, igual lo usamos para mostrar
  //    el nombre correcto del estado.
  // ==========================================================
  const loadEstados = async () => {
    const token = localStorage.getItem('CSI_Legal_token');
    setLoadingStates(true);

    try {
      const res = await fetch(`${API_URL}/api/estados-requisito`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Error cargando estados');
      }

      const opts: StatusOption[] = (json?.Estados || []).map((e: any) => ({
        id: Number(e.id),
        label: String(e.Estado),
      }));

      setStatusOptions(opts);
    } catch (e) {
      console.warn('[CompanyDashboard] loadEstados error:', e);
      setStatusOptions([]);
    } finally {
      setLoadingStates(false);
    }
  };

  // ==========================================================
  // 17) Cargar dashboard
  // ==========================================================
  const loadDashboard = async () => {
    if (!selectedCompany || !/^\d+$/.test(selectedCompany)) {
      setApiError('company inválido en la URL.');
      setLoading(false);
      return;
    }

    const url = `${API_URL}/api/evaluaciones/dashboard?companyId=${encodeURIComponent(
      selectedCompany
    )}`;
    const token = localStorage.getItem('CSI_Legal_token');

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        const msg = json?.message || 'Error cargando dashboard';
        const detail = json?.detail ? ` | detail: ${json.detail}` : '';
        throw new Error(`${msg}${detail}`);
      }

      const noEval = json?.hasEvaluation === false;
      setHasEvaluation(!noEval);

      if (noEval) {
        setEvaluacion(null);
        setItems([]);
        setChartData([]);
        return;
      }

      setEvaluacion(json?.Evaluacion ?? null);

      const apiItems = Array.isArray(json?.Items) ? json.Items : [];

      const normalized: DashboardItem[] = apiItems.map((x: any) => ({
        id: Number(x.id),
        evaluacionId: Number(x.evaluacionId),
        requisitoId: Number(x.requisitoId),
        name: String(x.name ?? ''),
        description: String(x.description ?? ''),
        estadoId: Number(x.estadoId),
        status: String(x.status ?? ''),
        responsible: String(x.responsible ?? x.responsable ?? 'No definido'),
        plannedDate: String(
          x.plannedDate ?? x.fechaPlanificada ?? 'No definido'
        ),
        periodicity: String(x.periodicity ?? x.periocidad ?? 'No definido'),
        lastUpdate: String(
          x.lastUpdate ?? x.ultimaActualizacion ?? x.UltimaActualizacion ?? ''
        ),

        // ==========================================================
        // CAMPOS DEL DETALLE DE EVALUACIÓN
        // Se pasan también en formato auxiliar para que ItemsTable
        // e ItemDetailModal puedan mostrar los valores reales guardados
        // en EvaluacionDetalle.
        // ==========================================================
        responsable: x.responsable ?? x.responsible ?? null,
        fechaPlanificada: x.fechaPlanificada ?? x.plannedDate ?? null,
        idPeriocidad: x.idPeriocidad ?? x.IdPeriocidad ?? null,
        periocidad: x.periocidad ?? x.periodicity ?? null,
        ultimaActualizacion:
          x.ultimaActualizacion ?? x.UltimaActualizacion ?? x.lastUpdate ?? null,
      }));

      setItems(normalized);

      const c = Array.isArray(json?.Chart) ? json.Chart : [];
      setChartData(
        c.map((z: any) => ({
          name: z.name,
          value: Number(z.value || 0),
        }))
      );
    } catch (e: any) {
      setApiError(e?.message || 'Error cargando dashboard');
      setHasEvaluation(true);
      setEvaluacion(null);
      setItems([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // GUARDAR CAMBIOS EN EVALUACIÓN
  // Este método se ejecuta desde el botón del encabezado.
  // No actualiza un requisito individual; actualiza el resumen general
  // de EvaluacionEncabezado para la evaluación activa de la empresa.
  //
  // Endpoint esperado:
  // PUT /api/evaluaciones/:evaluacionId/guardar-cambios
  //
  // Respuesta esperada:
  // {
  //   message: "Cambios de evaluación guardados correctamente",
  //   Evaluacion: { ... }
  // }
  // ==========================================================
  const handleSaveEvaluationChanges = async () => {
    if (!canSaveEvaluationChanges) return;

    if (!evaluacion?.id) {
      setApiError('No se encontró la evaluación activa.');
      return;
    }

    const token = localStorage.getItem('CSI_Legal_token');
    const url = `${API_URL}/api/evaluaciones/${evaluacion.id}/guardar-cambios`;

    setSavingEvaluationChanges(true);
    setApiError(null);

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(
          json?.message || 'No se pudieron guardar los cambios de evaluación'
        );
      }

      // Actualizamos el encabezado local para que los 3 KPI cambien
      // inmediatamente sin obligar a recargar toda la página.
      if (json?.Evaluacion) {
        setEvaluacion(json.Evaluacion);
      }

      // También recargamos el dashboard para mantener sincronizados:
      // - KPIs
      // - tabla
      // - gráfico
      await loadDashboard();
    } catch (e: any) {
      setApiError(e?.message || 'Error guardando cambios de evaluación');
    } finally {
      setSavingEvaluationChanges(false);
    }
  };

  // ==========================================================
  // 18) Cambio de estado
  //    Aunque el backend ya valida permisos, también lo bloqueamos
  //    en UI para que el lector ni siquiera vea la acción.
  // ==========================================================
  const handleStatusChange = async (
    detalleId: number,
    newEstadoId: number
  ) => {
    if (!canEditStatus) return;

    const token = localStorage.getItem('CSI_Legal_token');
    const url = `${API_URL}/api/evaluaciones/detalle/${detalleId}/estado`;

    const prev = items;
    setItems((curr) =>
      curr.map((i) =>
        i.id === detalleId ? { ...i, estadoId: newEstadoId } : i
      )
    );

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ estadoId: newEstadoId }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(json?.message || 'No se pudo actualizar el estado');
      }

      await loadDashboard();
    } catch (e) {
      console.error('[CompanyDashboard] update estado error:', e);
      setItems(prev);
      await loadDashboard();
    }
  };

  // ==========================================================
  // 19) Iniciar evaluación
  //    Solo perfiles con permiso EVALUACIONES_EDITAR deben verlo
  //    y ejecutarlo.
  // ==========================================================
  const handleStartEvaluation = async () => {
    if (!canStartEvaluation) {
      setApiError(
        'Tu perfil es de solo lectura. No puedes iniciar evaluaciones.'
      );
      return;
    }

    if (!selectedCompany || !/^\d+$/.test(selectedCompany)) {
      setApiError('company inválido en la URL.');
      return;
    }

    if (mode === 'selected' && selectedReqIds.length === 0) {
      setApiError(
        'Seleccione al menos 1 requisito para iniciar la evaluación.'
      );
      return;
    }

    const token = localStorage.getItem('CSI_Legal_token');
    const url = `${API_URL}/api/evaluaciones/iniciar`;

    setStarting(true);
    setApiError(null);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          companyId: Number(selectedCompany),
          mode,
          ...(mode === 'selected' ? { requisitosIds: selectedReqIds } : {}),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(json?.message || 'No se pudo iniciar la evaluación');
      }

      await loadDashboard();
    } catch (e: any) {
      setApiError(e?.message || 'Error iniciando evaluación');
    } finally {
      setStarting(false);
    }
  };

  // ==========================================================
  // 20) Helpers UI
  // ==========================================================
  const handleLogout = () => {
    logout();
  };

  const handleBackToCompanies = () => {
    if (selectedCountry) router.push(`/company-selection?country=${selectedCountry}`);
    else router.push('/company-selection');
  };

  // ==========================================================
  // 21) Cargas iniciales
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;
    loadCompanyInfo();
    loadEstados();
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, authChecked, selectedCompany]);

  // ==========================================================
  // 22) Filtros de tabla
  // ==========================================================
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        activeFilters.status === '' || item.status === activeFilters.status;
      const matchesResponsible =
        activeFilters.responsible === '' ||
        item.responsible === activeFilters.responsible;
      const matchesPeriodicity =
        activeFilters.periodicity === '' ||
        item.periodicity === activeFilters.periodicity;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesResponsible &&
        matchesPeriodicity
      );
    });
  }, [items, searchTerm, activeFilters]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const filterOptions = useMemo(
    () => ({
      status: Array.from(new Set(items.map((i) => i.status))).filter(Boolean),
      responsible: Array.from(new Set(items.map((i) => i.responsible))).filter(
        Boolean
      ),
      periodicity: Array.from(new Set(items.map((i) => i.periodicity))).filter(
        Boolean
      ),
    }),
    [items]
  );

  // ==========================================================
  // 23) Loading inicial
  // ==========================================================
  if (!isHydrated || authLoading || !authChecked || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // ==========================================================
  // 24) Error API
  // ==========================================================
  if (apiError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-elevation-1 sticky top-0 z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToCompanies}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
                >
                  <Icon name="ArrowLeftIcon" size={20} />
                  <span>Volver a empresas</span>
                </button>
                <div className="h-8 w-px bg-border hidden md:block" />
                <h1 className="text-xl font-semibold text-foreground">
                  Panel de Cumplimiento Legal
                </h1>
              </div>

              <UserContextMenu user={currentUser} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <BreadcrumbNavigation />
          <div className="bg-error/10 border border-error rounded-md p-4 text-error">
            {apiError}
          </div>

          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 25) No hay evaluación
  //    Si el usuario es lector, puede ver el mensaje, pero no
  //    debe tener controles para iniciar una evaluación.
  // ==========================================================
  if (!hasEvaluation) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-elevation-1 sticky top-0 z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToCompanies}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
                >
                  <Icon name="ArrowLeftIcon" size={20} />
                  <span>Volver a empresas</span>
                </button>
                <div className="h-8 w-px bg-border hidden md:block" />
                <h1 className="text-xl font-semibold text-foreground">
                  Panel de Cumplimiento Legal
                </h1>
              </div>

              <UserContextMenu user={currentUser} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <BreadcrumbNavigation />

          <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1">
            <h2 className="text-2xl font-semibold text-foreground">
              Aún no hay una evaluación creada
            </h2>
            <p className="text-muted-foreground mt-2">
              Inicia una evaluación para insertar encabezado y detalle con los
              requisitos seleccionados.
            </p>

            {!canStartEvaluation ? (
              <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Tu perfil es de solo lectura. Puedes visualizar la información
                  de esta empresa, pero no iniciar ni modificar evaluaciones.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'all'}
                        onChange={() => setMode('all')}
                      />
                      <span>Evaluar todos los requisitos</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'selected'}
                        onChange={() => setMode('selected')}
                      />
                      <span>Seleccionar algunos</span>
                    </label>
                  </div>

                  {mode === 'selected' && (
                    <div className="p-4 rounded-md border border-border bg-muted/30">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Requisitos seleccionados
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Seleccionados: <b>{selectedReqIds.length}</b>
                          </p>
                        </div>

                        <button
                          onClick={() => setIsReqModalOpen(true)}
                          className="px-3 py-2 rounded-md border border-input hover:bg-muted transition-smooth text-sm"
                        >
                          Buscar y seleccionar
                        </button>
                      </div>

                      {selectedReqIds.length > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          IDs: {selectedReqIds.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleStartEvaluation}
                    disabled={starting}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {starting ? 'Iniciando...' : 'Iniciar evaluación'}
                  </button>

                  <button
                    onClick={handleBackToCompanies}
                    className="px-4 py-2 rounded-md border border-input hover:bg-muted transition-smooth"
                  >
                    Volver
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {canStartEvaluation ? (
          <RequisitosPickerModal
            isOpen={isReqModalOpen}
            onClose={() => setIsReqModalOpen(false)}
            countryId={
              selectedCountry && /^\d+$/.test(selectedCountry)
                ? Number(selectedCountry)
                : undefined
            }
            initialSelectedIds={selectedReqIds}
            onConfirm={(ids) => setSelectedReqIds(ids)}
            title="Seleccionar requisitos para la evaluación"
          />
        ) : null}
      </div>
    );
  }

  // ==========================================================
  // 26) Dashboard real con evaluación
  // ==========================================================
  const kpiUltimaVerificacion = formatDateES(evaluacion?.UltimaVerificacion);
  const kpiUltimoHistorico = formatDateES(evaluacion?.UltimoHistorico);
  const kpiProximoEvento = formatDateES(evaluacion?.ProximoEvento);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-elevation-1 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToCompanies}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Icon name="ArrowLeftIcon" size={20} />
                <span>Volver a empresas</span>
              </button>
              <div className="h-8 w-px bg-border hidden md:block" />
              <h1 className="text-xl font-semibold text-foreground">
                Panel de Cumplimiento Legal
              </h1>
            </div>

            <UserContextMenu user={currentUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-foreground mb-2">
                Empresa:{' '}
                {companyInfoLoading
                  ? 'Cargando...'
                  : companyName || `ID: ${selectedCompany}`}
              </h2>

              <p className="text-muted-foreground font-caption">
                Gestión de requisitos legales y cumplimiento normativo
              </p>
            </div>

            {/* ======================================================
                GUARDAR CAMBIOS EN EVALUACIÓN
                Botón visible únicamente para usuario con permiso
                EVALUACIONES_EDITAR. No debe mostrarse a Empresa_Lector.

                Este botón no guarda un requisito individual. Su objetivo
                es consolidar/actualizar los campos del encabezado:
                - Última Verificación
                - Último Registro Histórico
                - Próximo Evento
               ====================================================== */}
            {canSaveEvaluationChanges ? (
              <button
                onClick={handleSaveEvaluationChanges}
                disabled={savingEvaluationChanges || !evaluacion?.id}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="ArrowPathIcon" size={18} />
                <span>
                  {savingEvaluationChanges
                    ? 'Guardando evaluación...'
                    : 'Guardar Cambios en Evaluación'}
                </span>
              </button>
            ) : null}
          </div>

          {loadingStates && (
            <p className="text-xs text-muted-foreground mt-1">
              Cargando catálogo de estados...
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Última Verificación"
            date={kpiUltimaVerificacion}
            icon="📋"
            variant="primary"
          />
          <KPICard
            title="Último Registro Histórico"
            date={kpiUltimoHistorico}
            icon="📊"
            variant="secondary"
          />
          <KPICard
            title="Próximo Evento"
            date={kpiProximoEvento}
            icon="📅"
            variant="accent"
          />
        </div>

        <div className="mb-8">
          <ComplianceChart data={chartData} />
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Elementos de Cumplimiento
              </h3>
              <p className="text-sm text-muted-foreground font-caption">
                Total: {filteredItems.length} elementos
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {}}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                <Icon name="ArrowDownTrayIcon" size={18} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              {canCreateNewElement ? (
                <button
                  onClick={() => setIsNewItemModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
                >
                  <Icon name="PlusIcon" size={18} />
                  <span>Nuevo Elemento</span>
                </button>
              ) : null}
            </div>
          </div>

          <ItemsTableFilters
            filterOptions={filterOptions}
            onFilterChange={(filters: ActiveFilters) => {
              setActiveFilters(filters);
              setCurrentPage(1);
            }}
            onSearchChange={(s: string) => {
              setSearchTerm(s);
              setCurrentPage(1);
            }}
          />

          <ItemsTable
            items={paginatedItems}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onItemClick={(item) => {
              setSelectedItem(item);
              setIsItemDetailModalOpen(true);
            }}
            statusOptions={statusOptions}
            onStatusChange={handleStatusChange}
            canEditStatus={canEditStatus}
          />
        </div>
      </div>

      {canCreateNewElement ? (
        <NewItemModal
          isOpen={isNewItemModalOpen}
          onClose={() => setIsNewItemModalOpen(false)}
          onSubmit={() => {}}
        />
      ) : null}

      <ItemDetailModal
        isOpen={isItemDetailModalOpen}
        item={selectedItem as any}
        onClose={() => {
          setIsItemDetailModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={async () => {
          // Al guardar información desde el modal, recargamos el dashboard
          // para refrescar tabla, KPIs y cualquier dato derivado.
          await loadDashboard();
        }}
      />
    </div>
  );
}
