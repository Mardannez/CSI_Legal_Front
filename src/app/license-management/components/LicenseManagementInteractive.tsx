'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/context/AuthContext';
import AppImage from '@/components/ui/AppImage';
import UserContextMenu from '@/components/common/UserContextMenu';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type EstadoLicencia =
  | 'ACTIVA'
  | 'PENDIENTE'
  | 'SUSPENDIDA'
  | 'CANCELADA'
  | 'VENCIDA'
  | 'SIN_LICENCIA'
  | string;

type TipoLicencia = 'ANUAL' | 'SEMESTRAL' | 'MENSUAL' | 'PRUEBA' | string;

interface EmpresaItem {
  id: number;
  nombre: string;
  estado: number;
  idPais?: number | null;
}

interface LicenciaItem {
  id: number | null;
  idEmpresa: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoLicencia | null;
  estadoCalculado: EstadoLicencia;
  tipoLicencia: TipoLicencia | null;
  maxUsuarios: number | null;
  monto: number | null;
  moneda: string | null;
  fechaPago: string | null;
  referenciaPago: string | null;
  observaciones: string | null;
  fechaRegistro: string | null;
  fechaActualizacion: string | null;
  idUsuarioRegistro: number | null;
  diasRestantes: number | null;
  puedeAcceder: boolean;
}

interface LicenciaRow {
  Empresa: EmpresaItem;
  Licencia: LicenciaItem;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LicenciasResponse {
  Licencias: LicenciaRow[];
  Pagination: PaginationInfo;
}

interface LicenciaEmpresaDetalleResponse {
  Empresa: EmpresaItem;
  LicenciaActual: LicenciaItem | null;
  Historial: LicenciaItem[];
}

interface CatalogosLicenciaResponse {
  EstadosLicencia: string[];
  TiposLicencia: string[];
  Monedas: string[];
}

interface LicenseFormState {
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  tipoLicencia: string;
  maxUsuarios: string;
  monto: string;
  moneda: string;
  fechaPago: string;
  referenciaPago: string;
  observaciones: string;
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('CSI_Legal_token');
    localStorage.removeItem('CSI_Legal_user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  const text = await res.text();
  let json: any = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(json?.message || `Error HTTP ${res.status}`);
  }

  return json;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMoney(value?: number | null, moneda = 'HNL') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${moneda || 'HNL'} ${Number(value).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function estadoLicenciaLabel(value?: EstadoLicencia | null) {
  const estado = value || 'SIN_LICENCIA';

  switch (estado) {
    case 'ACTIVA':
      return 'Activa';
    case 'VENCIDA':
      return 'Vencida';
    case 'SUSPENDIDA':
      return 'Suspendida';
    case 'CANCELADA':
      return 'Cancelada';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'SIN_LICENCIA':
      return 'Sin licencia';
    default:
      return estado;
  }
}

function estadoLicenciaBadgeClass(value?: EstadoLicencia | null) {
  const estado = value || 'SIN_LICENCIA';

  if (estado === 'ACTIVA') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (estado === 'PENDIENTE') {
    return 'bg-warning/10 text-warning border-warning/20';
  }

  if (estado === 'SUSPENDIDA') {
    return 'bg-warning/10 text-warning border-warning/20';
  }

  return 'bg-error/10 text-error border-error/20';
}

function defaultLicenseForm(): LicenseFormState {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    fechaInicio: today,
    fechaFin: nextYear.toISOString().slice(0, 10),
    estado: 'ACTIVA',
    tipoLicencia: 'ANUAL',
    maxUsuarios: '10',
    monto: '',
    moneda: 'HNL',
    fechaPago: today,
    referenciaPago: '',
    observaciones: '',
  };
}

function formFromLicense(licencia: LicenciaItem): LicenseFormState {
  return {
    fechaInicio: licencia.fechaInicio || '',
    fechaFin: licencia.fechaFin || '',
    estado: licencia.estado || 'ACTIVA',
    tipoLicencia: licencia.tipoLicencia || 'ANUAL',
    maxUsuarios: licencia.maxUsuarios ? String(licencia.maxUsuarios) : '',
    monto: licencia.monto !== null && licencia.monto !== undefined ? String(licencia.monto) : '',
    moneda: licencia.moneda || 'HNL',
    fechaPago: licencia.fechaPago || '',
    referenciaPago: licencia.referenciaPago || '',
    observaciones: licencia.observaciones || '',
  };
}

function buildLicensePayload(form: LicenseFormState) {
  return {
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
    estado: form.estado,
    tipoLicencia: form.tipoLicencia,
    maxUsuarios: form.maxUsuarios ? Number(form.maxUsuarios) : null,
    monto: form.monto ? Number(form.monto) : null,
    moneda: form.moneda || 'HNL',
    fechaPago: form.fechaPago || null,
    referenciaPago: form.referenciaPago.trim() || null,
    observaciones: form.observaciones.trim() || null,
  };
}

export default function LicenseManagementInteractive() {
  const router = useRouter();
  const auth = useAuth() as any;
  const session = auth?.session;
  const { logout, loading: authLoading } = useAuth() as any;

  const [loadingPage, setLoadingPage] = useState(true);

  // ==========================================================
  // LISTADO PRINCIPAL
  // ==========================================================
  const [rows, setRows] = useState<LicenciaRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [loadingLicencias, setLoadingLicencias] = useState(false);

  // ==========================================================
  // CATÁLOGOS
  // ==========================================================
  const [catalogos, setCatalogos] = useState<CatalogosLicenciaResponse>({
    EstadosLicencia: ['ACTIVA', 'PENDIENTE', 'SUSPENDIDA', 'CANCELADA'],
    TiposLicencia: ['ANUAL', 'SEMESTRAL', 'MENSUAL', 'PRUEBA'],
    Monedas: ['HNL', 'USD'],
  });

  // ==========================================================
  // MODAL CREAR / EDITAR LICENCIA
  // ==========================================================
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [savingLicense, setSavingLicense] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LicenciaRow | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<number | null>(null);
  const [licenseForm, setLicenseForm] = useState<LicenseFormState>(
    defaultLicenseForm()
  );

  // ==========================================================
  // MODAL HISTORIAL
  // ==========================================================
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyEmpresa, setHistoryEmpresa] = useState<EmpresaItem | null>(null);
  const [historyLicenciaActual, setHistoryLicenciaActual] =
    useState<LicenciaItem | null>(null);
  const [historyRows, setHistoryRows] = useState<LicenciaItem[]>([]);

  // ==========================================================
  // PROTECCIÓN DE RUTA
  // Solo SUPER_ADMIN debe entrar al mantenimiento de licencias.
  // Los usuarios por empresa no deben administrar licencias.
  // ==========================================================
  useEffect(() => {
    if (session === undefined) return;

    if (!session?.isGlobalAdmin) {
      router.replace(session?.landingPage || '/countries-selection');
      return;
    }

    setLoadingPage(false);
  }, [session, router]);

  const currentUser = useMemo(() => {
    const firstEmpresaRole = session?.empresas?.[0]?.roles?.join(', ') || 'Usuario';

    return {
      name: session?.user?.nombreCompleto || session?.user?.usuario || 'Usuario',
      email: session?.user?.correo || session?.user?.usuario || '',
      role: session?.isGlobalAdmin ? 'SUPER_ADMIN' : firstEmpresaRole,
      avatar: '',
      isGlobalAdmin: !!session?.isGlobalAdmin,
    };
  }, [session]);

  const filteredSummary = useMemo(() => {
    const estado = estadoFilter === 'TODOS' ? 'todos los estados' : estadoLicenciaLabel(estadoFilter);
    return `Mostrando ${pagination.total} empresa(s) • Filtro: ${estado}`;
  }, [pagination.total, estadoFilter]);

  // ==========================================================
  // CARGA INICIAL
  // ==========================================================
  useEffect(() => {
    if (!session?.isGlobalAdmin) return;
    loadCatalogos();
  }, [session]);

  useEffect(() => {
    if (!session?.isGlobalAdmin) return;
    loadLicencias();
  }, [session, pagination.page, pagination.pageSize, estadoFilter]);

  // ==========================================================
  // API - CATÁLOGOS
  // ==========================================================
  const loadCatalogos = async () => {
    try {
      const json = await apiFetch<CatalogosLicenciaResponse>(
        `${API_URL}/api/licencias/catalogos`
      );

      setCatalogos({
        EstadosLicencia: json?.EstadosLicencia || catalogos.EstadosLicencia,
        TiposLicencia: json?.TiposLicencia || catalogos.TiposLicencia,
        Monedas: json?.Monedas || catalogos.Monedas,
      });
    } catch (error: any) {
      alert(error?.message || 'Error cargando catálogos de licencias');
    }
  };

  // ==========================================================
  // API - LICENCIAS
  // ==========================================================
  const loadLicencias = async (forcedSearch?: string) => {
    setLoadingLicencias(true);

    try {
      const q = encodeURIComponent((forcedSearch ?? search).trim());
      const estadoParam =
        estadoFilter === 'TODOS' ? '' : `&estadoLicencia=${estadoFilter}`;

      const json = await apiFetch<LicenciasResponse>(
        `${API_URL}/api/licencias?page=${pagination.page}&pageSize=${pagination.pageSize}&q=${q}${estadoParam}`
      );

      setRows(json?.Licencias || []);
      setPagination((prev) => ({
        ...prev,
        ...(json?.Pagination || prev),
      }));
    } catch (error: any) {
      alert(error?.message || 'Error cargando licencias');
    } finally {
      setLoadingLicencias(false);
    }
  };

  const handleSearch = async () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    await loadLicencias(search);
  };

  const openCreateLicenseModal = (row: LicenciaRow) => {
    setSelectedRow(row);
    setEditingLicenseId(null);
    setLicenseForm(defaultLicenseForm());
    setShowLicenseModal(true);
  };

  const openEditLicenseModal = (row: LicenciaRow) => {
    if (!row.Licencia?.id) {
      openCreateLicenseModal(row);
      return;
    }

    setSelectedRow(row);
    setEditingLicenseId(row.Licencia.id);
    setLicenseForm(formFromLicense(row.Licencia));
    setShowLicenseModal(true);
  };

  const closeLicenseModal = () => {
    setShowLicenseModal(false);
    setSelectedRow(null);
    setEditingLicenseId(null);
    setLicenseForm(defaultLicenseForm());
  };

  const saveLicense = async () => {
    if (!selectedRow?.Empresa?.id) return;

    if (!licenseForm.fechaInicio) {
      alert('Seleccione la fecha de inicio');
      return;
    }

    if (!licenseForm.fechaFin) {
      alert('Seleccione la fecha de fin');
      return;
    }

    if (licenseForm.fechaFin < licenseForm.fechaInicio) {
      alert('La fecha fin no puede ser menor que la fecha inicio');
      return;
    }

    setSavingLicense(true);

    try {
      const payload = buildLicensePayload(licenseForm);

      if (editingLicenseId) {
        await apiFetch(`${API_URL}/api/licencias/${editingLicenseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(
          `${API_URL}/api/licencias/empresa/${selectedRow.Empresa.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
      }

      await loadLicencias();
      closeLicenseModal();
    } catch (error: any) {
      alert(error?.message || 'Error guardando licencia');
    } finally {
      setSavingLicense(false);
    }
  };

  const suspendLicense = async (row: LicenciaRow) => {
    if (!row.Licencia?.id) return;

    if (!confirm(`¿Desea suspender la licencia de "${row.Empresa.nombre}"?`)) {
      return;
    }

    try {
      await apiFetch(`${API_URL}/api/licencias/${row.Licencia.id}/suspender`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observaciones: 'Licencia suspendida desde mantenimiento de licencias',
        }),
      });

      await loadLicencias();
    } catch (error: any) {
      alert(error?.message || 'Error suspendiendo licencia');
    }
  };

  const cancelLicense = async (row: LicenciaRow) => {
    if (!row.Licencia?.id) return;

    if (!confirm(`¿Desea cancelar la licencia de "${row.Empresa.nombre}"?`)) {
      return;
    }

    try {
      await apiFetch(`${API_URL}/api/licencias/${row.Licencia.id}/cancelar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observaciones: 'Licencia cancelada desde mantenimiento de licencias',
        }),
      });

      await loadLicencias();
    } catch (error: any) {
      alert(error?.message || 'Error cancelando licencia');
    }
  };

  const openHistoryModal = async (row: LicenciaRow) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setHistoryEmpresa(row.Empresa);
    setHistoryLicenciaActual(null);
    setHistoryRows([]);

    try {
      const json = await apiFetch<LicenciaEmpresaDetalleResponse>(
        `${API_URL}/api/licencias/empresa/${row.Empresa.id}`
      );

      setHistoryEmpresa(json?.Empresa || row.Empresa);
      setHistoryLicenciaActual(json?.LicenciaActual || null);
      setHistoryRows(json?.Historial || []);
    } catch (error: any) {
      alert(error?.message || 'Error cargando historial de licencias');
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryEmpresa(null);
    setHistoryLicenciaActual(null);
    setHistoryRows([]);
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/countries-selection');
  };

  const handleLogout = () => {
    logout();
  };

  if (loadingPage || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[60vh] flex items-center justify-center">
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
                alt="CSI Legal Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>

            <UserContextMenu user={currentUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-6 space-y-6">
        <BreadcrumbNavigation
          customSegments={[
            {
              label: 'Configuración',
              href: '#',
              isActive: false,
            },
            {
              label: 'Gestión de Licencias',
              href: '/license-management',
              isActive: true,
            },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Gestión de Licencias
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra vigencias, renovaciones, suspensiones y cancelaciones de licencias por empresa.
            </p>
          </div>

          <div>
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
            >
              <Icon name="ArrowLeftIcon" size={16} />
              Volver
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Buscar empresa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Buscar por nombre de empresa..."
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
                <Icon
                  name="MagnifyingGlassIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Estado de licencia
              </label>
              <select
                value={estadoFilter}
                onChange={(e) => {
                  setEstadoFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVA">Activas</option>
                <option value="VENCIDA">Vencidas</option>
                <option value="SIN_LICENCIA">Sin licencia</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="SUSPENDIDA">Suspendidas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={handleSearch}
                className="px-5 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth"
              >
                Buscar
              </button>

              <button
                onClick={() => loadLicencias()}
                className="px-5 py-3 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth flex items-center gap-2"
              >
                <Icon name="ArrowPathIcon" size={16} />
                Refrescar
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{filteredSummary}</p>
        </div>

        {/* Tabla */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loadingLicencias ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando licencias...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay empresas para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Estado Licencia
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Vigencia
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Tipo / Usuarios
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Pago
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Acceso
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const licencia = row.Licencia;
                    const hasLicense = !!licencia?.id;

                    return (
                      <tr
                        key={row.Empresa.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-medium text-foreground">
                              {row.Empresa.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ID Empresa: {row.Empresa.id}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoLicenciaBadgeClass(
                                licencia.estadoCalculado
                              )}`}
                            >
                              {estadoLicenciaLabel(licencia.estadoCalculado)}
                            </span>

                            {licencia.estado !== licencia.estadoCalculado && (
                              <p className="text-xs text-muted-foreground">
                                Estado base: {estadoLicenciaLabel(licencia.estado)}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-foreground">
                            <p>Inicio: {formatDate(licencia.fechaInicio)}</p>
                            <p>Fin: {formatDate(licencia.fechaFin)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {licencia.diasRestantes ?? 0} día(s) restantes
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-foreground">
                            <p>{licencia.tipoLicencia || '—'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Máx. usuarios: {licencia.maxUsuarios ?? '—'}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-foreground">
                            <p>{formatMoney(licencia.monto, licencia.moneda || 'HNL')}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pago: {formatDate(licencia.fechaPago)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ref: {licencia.referenciaPago || '—'}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                              licencia.puedeAcceder
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-error/10 text-error border-error/20'
                            }`}
                          >
                            {licencia.puedeAcceder ? 'Puede acceder' : 'Bloqueado'}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() =>
                                hasLicense
                                  ? openEditLicenseModal(row)
                                  : openCreateLicenseModal(row)
                              }
                              className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                            >
                              {hasLicense ? 'Editar' : 'Crear'}
                            </button>

                            <button
                              onClick={() => openCreateLicenseModal(row)}
                              className="px-3 py-2 text-sm border border-primary text-primary rounded-md hover:bg-primary/10 transition-smooth"
                            >
                              Renovar
                            </button>

                            <button
                              onClick={() => openHistoryModal(row)}
                              className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                            >
                              Historial
                            </button>

                            {hasLicense && licencia.estado !== 'SUSPENDIDA' && (
                              <button
                                onClick={() => suspendLicense(row)}
                                className="px-3 py-2 text-sm border border-warning text-warning rounded-md hover:bg-warning/10 transition-smooth"
                              >
                                Suspender
                              </button>
                            )}

                            {hasLicense && licencia.estado !== 'CANCELADA' && (
                              <button
                                onClick={() => cancelLicense(row)}
                                className="px-3 py-2 text-sm border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages || 1}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              disabled={pagination.page <= 1}
              className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth disabled:opacity-50"
            >
              Anterior
            </button>

            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.totalPages || 1, prev.page + 1),
                }))
              }
              disabled={pagination.page >= (pagination.totalPages || 1)}
              className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          MODAL CREAR / EDITAR / RENOVAR LICENCIA
         ====================================================== */}
      {showLicenseModal && selectedRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {editingLicenseId ? 'Editar Licencia' : 'Nueva / Renovar Licencia'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Empresa: {selectedRow.Empresa.nombre}
                </p>
              </div>

              <button
                onClick={closeLicenseModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={licenseForm.fechaInicio}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        fechaInicio: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Fecha Fin *
                  </label>
                  <input
                    type="date"
                    value={licenseForm.fechaFin}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        fechaFin: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado *
                  </label>
                  <select
                    value={licenseForm.estado}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        estado: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  >
                    {catalogos.EstadosLicencia.map((estado) => (
                      <option key={estado} value={estado}>
                        {estadoLicenciaLabel(estado)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo *
                  </label>
                  <select
                    value={licenseForm.tipoLicencia}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        tipoLicencia: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  >
                    {catalogos.TiposLicencia.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Máx. Usuarios
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={licenseForm.maxUsuarios}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        maxUsuarios: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Monto
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={licenseForm.monto}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        monto: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Moneda
                  </label>
                  <select
                    value={licenseForm.moneda}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        moneda: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  >
                    {catalogos.Monedas.map((moneda) => (
                      <option key={moneda} value={moneda}>
                        {moneda}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Fecha Pago
                  </label>
                  <input
                    type="date"
                    value={licenseForm.fechaPago}
                    onChange={(e) =>
                      setLicenseForm((prev) => ({
                        ...prev,
                        fechaPago: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Referencia de Pago
                </label>
                <input
                  type="text"
                  value={licenseForm.referenciaPago}
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      referenciaPago: e.target.value,
                    }))
                  }
                  placeholder="Ej: transferencia, recibo, factura, referencia bancaria..."
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Observaciones
                </label>
                <textarea
                  value={licenseForm.observaciones}
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      observaciones: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Notas internas sobre renovación, pago o condición comercial..."
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={closeLicenseModal}
                disabled={savingLicense}
                className="px-5 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={saveLicense}
                disabled={savingLicense}
                className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {savingLicense ? 'Guardando...' : 'Guardar Licencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL HISTORIAL DE LICENCIAS
         ====================================================== */}
      {showHistoryModal && historyEmpresa && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Historial de Licencias
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Empresa: {historyEmpresa.nombre}
                </p>
              </div>

              <button
                onClick={closeHistoryModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {loadingHistory ? (
                <div className="p-8 text-center text-muted-foreground">
                  Cargando historial...
                </div>
              ) : historyRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Esta empresa todavía no tiene licencias registradas.
                </div>
              ) : (
                <>
                  {historyLicenciaActual && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Licencia más reciente
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoLicenciaBadgeClass(
                            historyLicenciaActual.estadoCalculado
                          )}`}
                        >
                          {estadoLicenciaLabel(historyLicenciaActual.estadoCalculado)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(historyLicenciaActual.fechaInicio)} - {formatDate(historyLicenciaActual.fechaFin)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Vigencia
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Monto
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Referencia
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            Observaciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {historyRows.map((licencia) => (
                          <tr key={licencia.id} className="border-b border-border last:border-b-0">
                            <td className="px-4 py-4 align-top">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoLicenciaBadgeClass(
                                  licencia.estadoCalculado
                                )}`}
                              >
                                {estadoLicenciaLabel(licencia.estadoCalculado)}
                              </span>
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-foreground">
                              <p>{formatDate(licencia.fechaInicio)}</p>
                              <p>{formatDate(licencia.fechaFin)}</p>
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-foreground">
                              {licencia.tipoLicencia || '—'}
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-foreground">
                              {formatMoney(licencia.monto, licencia.moneda || 'HNL')}
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-foreground">
                              {licencia.referenciaPago || '—'}
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-muted-foreground">
                              {licencia.observaciones || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end">
              <button
                onClick={closeHistoryModal}
                className="px-5 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
