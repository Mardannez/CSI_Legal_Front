'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/context/AuthContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type EstadoValue = 0 | 1;

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Permiso {
  IdPermiso: number;
  Codigo: string;
  Nombre: string;
  Modulo: string;
  Descripcion?: string | null;
  Estado: number;
  FechaRegistro: string;
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

function estadoLabel(value?: number) {
  return Number(value) === 1 ? 'Activo' : 'Inactivo';
}

function estadoBadgeClass(value?: number) {
  return Number(value) === 1
    ? 'bg-success/10 text-success border-success/20'
    : 'bg-error/10 text-error border-error/20';
}

export default function PermissionsMaintenanceInteractive() {
  const router = useRouter();

  const {
    session,
    logout,
    loading: authLoading,
  } = useAuth() as any;

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [moduloFilter, setModuloFilter] = useState('todos');

  const [showPermisoModal, setShowPermisoModal] = useState(false);
  const [editingPermisoId, setEditingPermisoId] = useState<number | null>(null);
  const [savingPermiso, setSavingPermiso] = useState(false);

  const [permisoForm, setPermisoForm] = useState({
    codigo: '',
    nombre: '',
    modulo: '',
    descripcion: '',
    estado: 1 as EstadoValue,
  });

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
    if (search.trim()) {
      return `Buscando: "${search.trim()}"`;
    }
    return `Mostrando ${pagination.total} permiso(s)`;
  }, [search, pagination.total]);

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    if (session === undefined && authLoading) return;

    if (!authLoading && !session?.isGlobalAdmin) {
      router.replace(session?.landingPage || '/countries-selection');
      return;
    }

    if (!authLoading) {
      setLoadingPage(false);
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!session?.isGlobalAdmin) return;
    loadPermisos();
  }, [session, pagination.page, pagination.pageSize, estadoFilter, moduloFilter]);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/roles-management');
  };

  const loadPermisos = async (forcedSearch?: string) => {
    setLoadingPermisos(true);

    try {
      const q = encodeURIComponent((forcedSearch ?? search).trim());
      const estadoParam =
        estadoFilter === 'todos' ? '' : `&estado=${estadoFilter}`;
      const moduloParam =
        moduloFilter === 'todos' ? '' : `&modulo=${encodeURIComponent(moduloFilter)}`;

      const json = await apiFetch<{
        Permisos: Permiso[];
        Pagination: PaginationInfo;
      }>(
        `${API_URL}/api/permisos?page=${pagination.page}&pageSize=${pagination.pageSize}&q=${q}${estadoParam}${moduloParam}`
      );

      setPermisos(json?.Permisos || []);
      setPagination((prev) => ({
        ...prev,
        ...(json?.Pagination || prev),
      }));
    } catch (error: any) {
      alert(error?.message || 'Error cargando permisos');
    } finally {
      setLoadingPermisos(false);
    }
  };

  const handleSearch = async () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    await loadPermisos(search);
  };

  const distinctModulos = useMemo(() => {
    const values = permisos
      .map((item) => item.Modulo)
      .filter(Boolean)
      .map((item) => item.trim());

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [permisos]);

  const openCreateModal = () => {
    setEditingPermisoId(null);
    setPermisoForm({
      codigo: '',
      nombre: '',
      modulo: '',
      descripcion: '',
      estado: 1,
    });
    setShowPermisoModal(true);
  };

  const openEditModal = (permiso: Permiso) => {
    setEditingPermisoId(permiso.IdPermiso);
    setPermisoForm({
      codigo: permiso.Codigo || '',
      nombre: permiso.Nombre || '',
      modulo: permiso.Modulo || '',
      descripcion: permiso.Descripcion || '',
      estado: Number(permiso.Estado || 1) as EstadoValue,
    });
    setShowPermisoModal(true);
  };

  const closePermisoModal = () => {
    setShowPermisoModal(false);
    setEditingPermisoId(null);
  };

  const savePermiso = async () => {
    if (!permisoForm.codigo.trim()) {
      alert('Ingrese el código del permiso');
      return;
    }

    if (!permisoForm.nombre.trim()) {
      alert('Ingrese el nombre del permiso');
      return;
    }

    if (!permisoForm.modulo.trim()) {
      alert('Ingrese el módulo del permiso');
      return;
    }

    setSavingPermiso(true);

    try {
      if (editingPermisoId) {
        await apiFetch(`${API_URL}/api/permisos/${editingPermisoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(permisoForm),
        });
      } else {
        await apiFetch(`${API_URL}/api/permisos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(permisoForm),
        });
      }

      await loadPermisos();
      closePermisoModal();
    } catch (error: any) {
      alert(error?.message || 'Error guardando permiso');
    } finally {
      setSavingPermiso(false);
    }
  };

  const deletePermiso = async (permiso: Permiso) => {
    if (!confirm(`¿Desea inactivar el permiso "${permiso.Nombre}"?`)) return;

    try {
      await apiFetch(`${API_URL}/api/permisos/${permiso.IdPermiso}`, {
        method: 'DELETE',
      });

      await loadPermisos();
    } catch (error: any) {
      alert(error?.message || 'Error inactivando permiso');
    }
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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNavigation
          customSegments={[
            {
              label: 'Configuración',
              href: '#',
              isActive: false,
            },
            {
              label: 'Mantenimiento de Permisos',
              href: '/permissions-management',
              isActive: true,
            },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Mantenimiento de Permisos
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra el catálogo de permisos del sistema.
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

        <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Buscar permiso..."
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Módulo
              </label>
              <select
                value={moduloFilter}
                onChange={(e) => {
                  setModuloFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              >
                <option value="todos">Todos</option>
                {distinctModulos.map((modulo) => (
                  <option key={modulo} value={modulo}>
                    {modulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                value={estadoFilter}
                onChange={(e) => {
                  setEstadoFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              >
                <option value="todos">Todos</option>
                <option value="1">Activos</option>
                <option value="0">Inactivos</option>
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
                onClick={openCreateModal}
                className="px-5 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth flex items-center gap-2"
              >
                <Icon name="PlusIcon" size={16} />
                Nuevo Permiso
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{filteredSummary}</p>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loadingPermisos ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando permisos...
            </div>
          ) : permisos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay permisos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Módulo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {permisos.map((permiso) => (
                    <tr
                      key={permiso.IdPermiso}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4 text-sm text-foreground">
                        {permiso.Codigo}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {permiso.Nombre}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {permiso.Modulo}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {permiso.Descripcion || '—'}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadgeClass(
                            permiso.Estado
                          )}`}
                        >
                          {estadoLabel(permiso.Estado)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(permiso)}
                            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deletePermiso(permiso)}
                            className="px-3 py-2 text-sm border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
                          >
                            Inactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
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
      </main>

      {showPermisoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingPermisoId ? 'Editar Permiso' : 'Nuevo Permiso'}
              </h2>

              <button
                onClick={closePermisoModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={permisoForm.codigo}
                    onChange={(e) =>
                      setPermisoForm((prev) => ({
                        ...prev,
                        codigo: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado
                  </label>
                  <select
                    value={permisoForm.estado}
                    onChange={(e) =>
                      setPermisoForm((prev) => ({
                        ...prev,
                        estado: Number(e.target.value) as EstadoValue,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value={1}>Activo</option>
                    <option value={0}>Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={permisoForm.nombre}
                  onChange={(e) =>
                    setPermisoForm((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Módulo *
                </label>
                <input
                  type="text"
                  value={permisoForm.modulo}
                  onChange={(e) =>
                    setPermisoForm((prev) => ({
                      ...prev,
                      modulo: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <textarea
                  value={permisoForm.descripcion}
                  onChange={(e) =>
                    setPermisoForm((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={closePermisoModal}
                className="px-5 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cancelar
              </button>

              <button
                onClick={savePermiso}
                disabled={savingPermiso}
                className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {savingPermiso ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}