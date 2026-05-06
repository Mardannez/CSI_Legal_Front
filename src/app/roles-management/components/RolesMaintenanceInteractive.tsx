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

interface Rol {
  IdRol: number;
  Codigo: string;
  Nombre: string;
  Ambito: 'GLOBAL' | 'EMPRESA' | string;
  Descripcion?: string | null;
  Estado: number;
  FechaRegistro: string;
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

interface RolPermisoItem {
  IdRolPermiso: number;
  IdRol: number;
  IdPermiso: number;
  Estado: number;
  FechaRegistro: string;
  Permiso?: Permiso | null;
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

export default function RolesMaintenanceInteractive() {
  const router = useRouter();

  const {
    session,
    logout,
    loading: authLoading,
  } = useAuth() as any;

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [roles, setRoles] = useState<Rol[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [ambitoFilter, setAmbitoFilter] = useState('todos');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const [roleForm, setRoleForm] = useState({
    codigo: '',
    nombre: '',
    ambito: 'EMPRESA',
    descripcion: '',
    estado: 1 as EstadoValue,
  });

  const [allPermisos, setAllPermisos] = useState<Permiso[]>([]);
  const [showPermisosModal, setShowPermisosModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Rol | null>(null);
  const [rolePermisos, setRolePermisos] = useState<RolPermisoItem[]>([]);
  const [loadingRolePermisos, setLoadingRolePermisos] = useState(false);
  const [selectedPermisoId, setSelectedPermisoId] = useState('');
  const [savingRolPermiso, setSavingRolPermiso] = useState(false);

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
    return `Mostrando ${pagination.total} rol(es)`;
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
    loadPermisosCatalog();
  }, [session]);

  useEffect(() => {
    if (!session?.isGlobalAdmin) return;
    loadRoles();
  }, [session, pagination.page, pagination.pageSize, estadoFilter, ambitoFilter]);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/user-management');
  };

  const loadRoles = async (forcedSearch?: string) => {
    setLoadingRoles(true);

    try {
      const q = encodeURIComponent((forcedSearch ?? search).trim());
      const estadoParam =
        estadoFilter === 'todos' ? '' : `&estado=${estadoFilter}`;
      const ambitoParam =
        ambitoFilter === 'todos' ? '' : `&ambito=${ambitoFilter}`;

      const json = await apiFetch<{
        Roles: Rol[];
        Pagination: PaginationInfo;
      }>(
        `${API_URL}/api/roles?page=${pagination.page}&pageSize=${pagination.pageSize}&q=${q}${estadoParam}${ambitoParam}`
      );

      setRoles(json?.Roles || []);
      setPagination((prev) => ({
        ...prev,
        ...(json?.Pagination || prev),
      }));
    } catch (error: any) {
      alert(error?.message || 'Error cargando roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSearch = async () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    await loadRoles(search);
  };

  const loadPermisosCatalog = async () => {
    try {
      const json = await apiFetch<{ Permisos: Permiso[] }>(
        `${API_URL}/api/permisos?page=1&pageSize=500`
      );
      setAllPermisos(json?.Permisos || []);
    } catch (error: any) {
      alert(error?.message || 'Error cargando catálogo de permisos');
    }
  };

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleForm({
      codigo: '',
      nombre: '',
      ambito: 'EMPRESA',
      descripcion: '',
      estado: 1,
    });
    setShowRoleModal(true);
  };

  const openEditModal = (rol: Rol) => {
    setEditingRoleId(rol.IdRol);
    setRoleForm({
      codigo: rol.Codigo || '',
      nombre: rol.Nombre || '',
      ambito: rol.Ambito || 'EMPRESA',
      descripcion: rol.Descripcion || '',
      estado: Number(rol.Estado || 1) as EstadoValue,
    });
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRoleId(null);
  };

  const saveRole = async () => {
    if (!roleForm.codigo.trim()) {
      alert('Ingrese el código del rol');
      return;
    }

    if (!roleForm.nombre.trim()) {
      alert('Ingrese el nombre del rol');
      return;
    }

    setSavingRole(true);

    try {
      if (editingRoleId) {
        await apiFetch(`${API_URL}/api/roles/${editingRoleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roleForm),
        });
      } else {
        await apiFetch(`${API_URL}/api/roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roleForm),
        });
      }

      await loadRoles();
      closeRoleModal();
    } catch (error: any) {
      alert(error?.message || 'Error guardando rol');
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (rol: Rol) => {
    if (!confirm(`¿Desea inactivar el rol "${rol.Nombre}"?`)) return;

    try {
      await apiFetch(`${API_URL}/api/roles/${rol.IdRol}`, {
        method: 'DELETE',
      });

      await loadRoles();
    } catch (error: any) {
      alert(error?.message || 'Error inactivando rol');
    }
  };

  const openPermisosModal = async (rol: Rol) => {
    setSelectedRole(rol);
    setShowPermisosModal(true);
    setSelectedPermisoId('');
    await loadRolePermisos(rol.IdRol);
  };

  const closePermisosModal = () => {
    setShowPermisosModal(false);
    setSelectedRole(null);
    setRolePermisos([]);
    setSelectedPermisoId('');
  };

  const loadRolePermisos = async (idRol: number) => {
    setLoadingRolePermisos(true);

    try {
      const json = await apiFetch<{ PermisosAsignados: RolPermisoItem[] }>(
        `${API_URL}/api/roles/${idRol}/permisos`
      );

      setRolePermisos(json?.PermisosAsignados || []);
    } catch (error: any) {
      alert(error?.message || 'Error cargando permisos del rol');
      setRolePermisos([]);
    } finally {
      setLoadingRolePermisos(false);
    }
  };

  const addPermisoToRole = async () => {
    if (!selectedRole?.IdRol) return;
    if (!selectedPermisoId) {
      alert('Seleccione un permiso');
      return;
    }

    setSavingRolPermiso(true);

    try {
      await apiFetch(`${API_URL}/api/roles/${selectedRole.IdRol}/permisos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idPermiso: Number(selectedPermisoId),
          estado: 1,
        }),
      });

      await loadRolePermisos(selectedRole.IdRol);
      setSelectedPermisoId('');
    } catch (error: any) {
      alert(error?.message || 'Error asignando permiso al rol');
    } finally {
      setSavingRolPermiso(false);
    }
  };

  const removePermisoFromRole = async (item: RolPermisoItem) => {
    if (!selectedRole?.IdRol) return;

    if (
      !confirm(
        `¿Desea inactivar el permiso "${item.Permiso?.Nombre || ''}" de este rol?`
      )
    ) {
      return;
    }

    try {
      await apiFetch(
        `${API_URL}/api/roles/${selectedRole.IdRol}/rol-permisos/${item.IdRolPermiso}`,
        {
          method: 'DELETE',
        }
      );

      await loadRolePermisos(selectedRole.IdRol);
    } catch (error: any) {
      alert(error?.message || 'Error inactivando permiso del rol');
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
              label: 'Mantenimiento de Roles',
              href: '/roles-management',
              isActive: true,
            },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Mantenimiento de Roles
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra el catálogo de roles y sus permisos asociados.
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
                placeholder="Buscar rol..."
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Ámbito
              </label>
              <select
                value={ambitoFilter}
                onChange={(e) => {
                  setAmbitoFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
              >
                <option value="todos">Todos</option>
                <option value="GLOBAL">Global</option>
                <option value="EMPRESA">Empresa</option>
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
                Nuevo Rol
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{filteredSummary}</p>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loadingRoles ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay roles registrados.
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
                      Ámbito
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
                  {roles.map((rol) => (
                    <tr
                      key={rol.IdRol}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4 text-sm text-foreground">
                        {rol.Codigo}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {rol.Nombre}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {rol.Ambito}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {rol.Descripcion || '—'}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadgeClass(
                            rol.Estado
                          )}`}
                        >
                          {estadoLabel(rol.Estado)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(rol)}
                            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => openPermisosModal(rol)}
                            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                          >
                            Permisos
                          </button>

                          <button
                            onClick={() => deleteRole(rol)}
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

      {showRoleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingRoleId ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>

              <button
                onClick={closeRoleModal}
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
                    value={roleForm.codigo}
                    onChange={(e) =>
                      setRoleForm((prev) => ({
                        ...prev,
                        codigo: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ámbito *
                  </label>
                  <select
                    value={roleForm.ambito}
                    onChange={(e) =>
                      setRoleForm((prev) => ({
                        ...prev,
                        ambito: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="GLOBAL">GLOBAL</option>
                    <option value="EMPRESA">EMPRESA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={roleForm.nombre}
                  onChange={(e) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      nombre: e.target.value,
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
                  value={roleForm.descripcion}
                  onChange={(e) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Estado
                </label>
                <select
                  value={roleForm.estado}
                  onChange={(e) =>
                    setRoleForm((prev) => ({
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

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={closeRoleModal}
                className="px-5 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cancelar
              </button>

              <button
                onClick={saveRole}
                disabled={savingRole}
                className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {savingRole ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermisosModal && selectedRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Permisos del Rol
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedRole.Nombre} ({selectedRole.Codigo})
                </p>
              </div>

              <button
                onClick={closePermisosModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <select
                  value={selectedPermisoId}
                  onChange={(e) => setSelectedPermisoId(e.target.value)}
                  className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Seleccione un permiso</option>
                  {allPermisos.map((permiso) => (
                    <option key={permiso.IdPermiso} value={permiso.IdPermiso}>
                      {permiso.Nombre} - {permiso.Codigo}
                    </option>
                  ))}
                </select>

                <div />

                <button
                  onClick={addPermisoToRole}
                  disabled={savingRolPermiso}
                  className="px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                >
                  {savingRolPermiso ? 'Guardando...' : 'Asignar Permiso'}
                </button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                {loadingRolePermisos ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Cargando permisos del rol...
                  </div>
                ) : rolePermisos.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Este rol no tiene permisos asignados.
                  </div>
                ) : (
                  <table className="w-full min-w-[900px]">
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
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolePermisos.map((item) => (
                        <tr
                          key={item.IdRolPermiso}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-4 text-sm text-foreground">
                            {item.Permiso?.Codigo || `Permiso #${item.IdPermiso}`}
                          </td>
                          <td className="px-4 py-4 text-sm text-foreground">
                            {item.Permiso?.Nombre || '—'}
                          </td>
                          <td className="px-4 py-4 text-sm text-foreground">
                            {item.Permiso?.Modulo || '—'}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadgeClass(
                                item.Estado
                              )}`}
                            >
                              {estadoLabel(item.Estado)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => removePermisoFromRole(item)}
                              className="px-3 py-2 text-sm border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
                            >
                              Inactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end">
              <button
                onClick={closePermisosModal}
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