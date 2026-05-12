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

type EstadoValue = 0 | 1;

interface EmpresaLicenciaInfo {
  id: number | null;
  idEmpresa: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: string | null;
  estadoCalculado:
    | 'ACTIVA'
    | 'VENCIDA'
    | 'SUSPENDIDA'
    | 'CANCELADA'
    | 'PENDIENTE'
    | 'SIN_LICENCIA'
    | string;
  tipoLicencia: string | null;
  maxUsuarios: number | null;
  diasRestantes: number | null;
  puedeAcceder: boolean;
}

interface EmpresaCatalogo {
  id: number;
  Nombre: string;
  Estado: number;

  // ==========================================================
  // LICENCIAS DE EMPRESA
  // Este campo viene desde usuarios.routes.js dentro de Empresa.
  // Permite mostrar si el usuario podrá entrar según la empresa.
  // ==========================================================
  Licencia?: EmpresaLicenciaInfo | null;
}

interface Rol {
  IdRol: number;
  Codigo: string;
  Nombre: string;
  Ambito: 'GLOBAL' | 'EMPRESA' | string;
  Descripcion?: string | null;
  Estado?: number;
}

interface UsuarioEmpresa {
  IdUsuarioEmpresa: number;
  IdUsuario: number;
  IdEmpresa: number;
  EsPrincipal: boolean;
  Estado: number;
  FechaAsignacion: string;
  Empresa?: EmpresaCatalogo | null;
}

interface UsuarioRolGlobal {
  IdUsuarioRolGlobal: number;
  IdUsuario: number;
  IdRol: number;
  Estado: number;
  FechaAsignacion: string;
  Rol?: Rol | null;
}

interface UsuarioEmpresaRol {
  IdUsuarioEmpresaRol: number;
  IdUsuarioEmpresa: number;
  IdRol: number;
  Estado: number;
  FechaAsignacion: string;
  Rol?: Rol | null;
}

interface UsuarioListItem {
  id: number;
  Usuario: string;
  FechaRegistro: string;
  Estado: number;
  NombreCompleto: string;
  Correo: string | null;
  EmpresasAsignadas?: UsuarioEmpresa[];
  RolesGlobales?: UsuarioRolGlobal[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface CatalogosResponse {
  Empresas: EmpresaCatalogo[];
  RolesGlobales: Rol[];
  RolesEmpresa: Rol[];
}

interface UserDetailResponse {
  Usuario: {
    id: number;
    Usuario: string;
    FechaRegistro: string;
    Estado: number;
    NombreCompleto: string;
    Correo: string | null;
  };
  EmpresasAsignadas: UsuarioEmpresa[];
  RolesGlobales: UsuarioRolGlobal[];
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

function estadoLabel(value?: number) {
  return Number(value) === 1 ? 'Activo' : 'Inactivo';
}

function estadoBadgeClass(value?: number) {
  return Number(value) === 1
    ? 'bg-success/10 text-success border-success/20'
    : 'bg-error/10 text-error border-error/20';
}

function licenciaLabel(licencia?: EmpresaLicenciaInfo | null) {
  const estado = licencia?.estadoCalculado || 'SIN_LICENCIA';

  switch (estado) {
    case 'ACTIVA':
      return 'Licencia activa';
    case 'VENCIDA':
      return 'Licencia vencida';
    case 'SUSPENDIDA':
      return 'Licencia suspendida';
    case 'CANCELADA':
      return 'Licencia cancelada';
    case 'PENDIENTE':
      return 'Licencia pendiente';
    case 'SIN_LICENCIA':
    default:
      return 'Sin licencia';
  }
}

function licenciaBadgeClass(licencia?: EmpresaLicenciaInfo | null) {
  const estado = licencia?.estadoCalculado || 'SIN_LICENCIA';

  if (estado === 'ACTIVA') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (estado === 'PENDIENTE') {
    return 'bg-warning/10 text-warning border-warning/20';
  }

  return 'bg-error/10 text-error border-error/20';
}

function licenciaDetalleTexto(licencia?: EmpresaLicenciaInfo | null) {
  if (!licencia || licencia.estadoCalculado === 'SIN_LICENCIA') {
    return 'No hay licencia registrada';
  }

  if (licencia.estadoCalculado === 'ACTIVA') {
    return `Vence: ${formatDate(licencia.fechaFin)} • ${licencia.diasRestantes ?? 0} día(s) restantes`;
  }

  return `Venció / finaliza: ${formatDate(licencia.fechaFin)}`;
}

export default function UsersMaintenanceInteractive() {
 

  const router = useRouter();
  const auth = useAuth() as any;
  const session = auth?.session;

  const [loadingPage, setLoadingPage] = useState(true);

  // ==========================================================
  // LISTADO PRINCIPAL
  // ==========================================================
  const [users, setUsers] = useState<UsuarioListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ==========================================================
  // CATÁLOGOS
  // ==========================================================
  const [catalogos, setCatalogos] = useState<CatalogosResponse>({
    Empresas: [],
    RolesGlobales: [],
    RolesEmpresa: [],
  });


     const {
    logout,
    loading: authLoading,
  } = useAuth();
 
  // ==========================================================
  // MODAL CREAR / EDITAR USUARIO
  // ==========================================================
  const [showUserModal, setShowUserModal] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [userForm, setUserForm] = useState({
    usuario: '',
    password: '',
    nombreCompleto: '',
    correo: '',
    estado: 1 as EstadoValue,
  });

  // ==========================================================
  // MODAL ACCESOS DE USUARIO
  // ==========================================================
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioListItem | null>(null);

  const [userEmpresas, setUserEmpresas] = useState<UsuarioEmpresa[]>([]);
  const [userRolesGlobales, setUserRolesGlobales] = useState<UsuarioRolGlobal[]>(
    []
  );
  const [selectedUsuarioEmpresaId, setSelectedUsuarioEmpresaId] = useState<
    number | null
  >(null);
  const [selectedUsuarioEmpresa, setSelectedUsuarioEmpresa] =
    useState<UsuarioEmpresa | null>(null);
  const [userEmpresaRoles, setUserEmpresaRoles] = useState<UsuarioEmpresaRol[]>(
    []
  );

  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingEmpresaRoles, setLoadingEmpresaRoles] = useState(false);

  // Form empresa asignada
  const [empresaForm, setEmpresaForm] = useState({
    idEmpresa: '',
    esPrincipal: false,
    estado: 1 as EstadoValue,
  });
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  // Form rol global
  const [rolGlobalForm, setRolGlobalForm] = useState({
    idRol: '',
    estado: 1 as EstadoValue,
  });
  const [savingRolGlobal, setSavingRolGlobal] = useState(false);

  // Form rol empresa
  const [rolEmpresaForm, setRolEmpresaForm] = useState({
    idRol: '',
    estado: 1 as EstadoValue,
  });
  const [savingRolEmpresa, setSavingRolEmpresa] = useState(false);

  // ==========================================================
  // PROTECCIÓN DE RUTA
  // ==========================================================
  useEffect(() => {
    // Esperamos a que session exista o se hidrate
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
    name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
    email: session?.user.correo || session?.user.usuario || '',
    role: session?.isGlobalAdmin ? 'SUPER_ADMIN' : firstEmpresaRole,
    avatar: '',
    isGlobalAdmin: !!session?.isGlobalAdmin, // <-- NUEVO
  };
}, [session]);

  // ==========================================================
  // CARGA INICIAL
  // ==========================================================
  useEffect(() => {
    if (!session?.isGlobalAdmin) return;

    loadCatalogos();
  }, [session]);

  useEffect(() => {
    if (!session?.isGlobalAdmin) return;

    loadUsers();
  }, [session, pagination.page, pagination.pageSize, estadoFilter]);

  // ==========================================================
  // HELPERS DE UI
  // ==========================================================
  const filteredSummary = useMemo(() => {
    if (search.trim()) {
      return `Buscando: "${search.trim()}"`;
    }
    return `Mostrando ${pagination.total} usuario(s)`;
  }, [search, pagination.total]);

  // ==========================================================
  // API - CATÁLOGOS
  // ==========================================================
  const loadCatalogos = async () => {
    try {
      const json = await apiFetch<CatalogosResponse>(
        `${API_URL}/api/usuarios/catalogos`
      );

      setCatalogos({
        Empresas: json?.Empresas || [],
        RolesGlobales: json?.RolesGlobales || [],
        RolesEmpresa: json?.RolesEmpresa || [],
      });
    } catch (error: any) {
      alert(error?.message || 'Error cargando catálogos');
    }
  };

  // ==========================================================
  // API - USUARIOS
  // ==========================================================
  const loadUsers = async (forcedSearch?: string) => {
    setLoadingUsers(true);

    try {
      const q = encodeURIComponent(
        (forcedSearch ?? search).trim()
      );

      const estadoParam =
        estadoFilter === 'todos' ? '' : `&estado=${estadoFilter}`;

      const json = await apiFetch<{
        Usuarios: UsuarioListItem[];
        Pagination: PaginationInfo;
      }>(
        `${API_URL}/api/usuarios?page=${pagination.page}&pageSize=${pagination.pageSize}&q=${q}${estadoParam}`
      );

      setUsers(json?.Usuarios || []);
      setPagination((prev) => ({
        ...prev,
        ...(json?.Pagination || prev),
      }));
    } catch (error: any) {
      alert(error?.message || 'Error cargando usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = async () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    await loadUsers(search);
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserForm({
      usuario: '',
      password: '',
      nombreCompleto: '',
      correo: '',
      estado: 1,
    });
    setShowUserModal(true);
  };

  const openEditModal = async (user: UsuarioListItem) => {
    try {
      const json = await apiFetch<UserDetailResponse>(
        `${API_URL}/api/usuarios/${user.id}`
      );

      setEditingUserId(user.id);
      setUserForm({
        usuario: json?.Usuario?.Usuario || '',
        password: '',
        nombreCompleto: json?.Usuario?.NombreCompleto || '',
        correo: json?.Usuario?.Correo || '',
        estado: Number(json?.Usuario?.Estado || 1) as EstadoValue,
      });

      setShowUserModal(true);
    } catch (error: any) {
      alert(error?.message || 'Error cargando detalle del usuario');
    }
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUserId(null);
  };

  const saveUser = async () => {
    if (!userForm.usuario.trim()) {
      alert('Ingrese el usuario');
      return;
    }

    if (!userForm.nombreCompleto.trim()) {
      alert('Ingrese el nombre completo');
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      alert('Ingrese la contraseña');
      return;
    }

    setSavingUser(true);

    try {
      if (editingUserId) {
        await apiFetch(`${API_URL}/api/usuarios/${editingUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario: userForm.usuario.trim(),
            password: userForm.password.trim() || undefined,
            nombreCompleto: userForm.nombreCompleto.trim(),
            correo: userForm.correo.trim(),
            estado: userForm.estado,
          }),
        });
      } else {
        await apiFetch(`${API_URL}/api/usuarios`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario: userForm.usuario.trim(),
            password: userForm.password.trim(),
            nombreCompleto: userForm.nombreCompleto.trim(),
            correo: userForm.correo.trim(),
            estado: userForm.estado,
          }),
        });
      }

      await loadUsers();
      closeUserModal();
    } catch (error: any) {
      alert(error?.message || 'Error guardando usuario');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (user: UsuarioListItem) => {
    if (!confirm(`¿Desea inactivar al usuario "${user.Usuario}"?`)) return;

    try {
      await apiFetch(`${API_URL}/api/usuarios/${user.id}`, {
        method: 'DELETE',
      });

      await loadUsers();
    } catch (error: any) {
      alert(error?.message || 'Error inactivando usuario');
    }
  };

  // ==========================================================
  // API - ACCESOS DE USUARIO
  // ==========================================================
  const openAccessModal = async (user: UsuarioListItem) => {
    setSelectedUser(user);
    setShowAccessModal(true);
    setSelectedUsuarioEmpresaId(null);
    setSelectedUsuarioEmpresa(null);
    setUserEmpresaRoles([]);
    setEmpresaForm({
      idEmpresa: '',
      esPrincipal: false,
      estado: 1,
    });
    setRolGlobalForm({
      idRol: '',
      estado: 1,
    });
    setRolEmpresaForm({
      idRol: '',
      estado: 1,
    });

    await loadUserAccess(user.id);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setSelectedUser(null);
    setSelectedUsuarioEmpresaId(null);
    setSelectedUsuarioEmpresa(null);
    setUserEmpresaRoles([]);
  };

  const loadUserAccess = async (userId: number) => {
    setLoadingAccess(true);

    try {
      const [empresasJson, rolesGlobalesJson] = await Promise.all([
        apiFetch<{
          EmpresasAsignadas: UsuarioEmpresa[];
        }>(`${API_URL}/api/usuarios/${userId}/empresas`),
        apiFetch<{
          RolesGlobales: UsuarioRolGlobal[];
        }>(`${API_URL}/api/usuarios/${userId}/roles-global`),
      ]);

      const empresas = empresasJson?.EmpresasAsignadas || [];
      const rolesGlobales = rolesGlobalesJson?.RolesGlobales || [];

      setUserEmpresas(empresas);
      setUserRolesGlobales(rolesGlobales);

      if (empresas.length > 0) {
        setSelectedUsuarioEmpresaId(empresas[0].IdUsuarioEmpresa);
        setSelectedUsuarioEmpresa(empresas[0]);
        await loadUserEmpresaRoles(userId, empresas[0].IdUsuarioEmpresa);
      } else {
        setSelectedUsuarioEmpresaId(null);
        setSelectedUsuarioEmpresa(null);
        setUserEmpresaRoles([]);
      }
    } catch (error: any) {
      alert(error?.message || 'Error cargando accesos del usuario');
    } finally {
      setLoadingAccess(false);
    }
  };

  const loadUserEmpresaRoles = async (
    userId: number,
    usuarioEmpresaId: number
  ) => {
    setLoadingEmpresaRoles(true);

    try {
      const json = await apiFetch<{
        RolesAsignados: UsuarioEmpresaRol[];
      }>(
        `${API_URL}/api/usuarios/${userId}/empresas/${usuarioEmpresaId}/roles`
      );

      setUserEmpresaRoles(json?.RolesAsignados || []);
    } catch (error: any) {
      alert(error?.message || 'Error cargando roles por empresa');
      setUserEmpresaRoles([]);
    } finally {
      setLoadingEmpresaRoles(false);
    }
  };

  // ==========================================================
  // API - USUARIO EMPRESA
  // ==========================================================
  const addEmpresaToUser = async () => {
    if (!selectedUser?.id) return;

    if (!empresaForm.idEmpresa) {
      alert('Seleccione una empresa');
      return;
    }

    setSavingEmpresa(true);

    try {
      await apiFetch(`${API_URL}/api/usuarios/${selectedUser.id}/empresas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idEmpresa: Number(empresaForm.idEmpresa),
          esPrincipal: empresaForm.esPrincipal,
          estado: empresaForm.estado,
        }),
      });

      await loadUserAccess(selectedUser.id);

      setEmpresaForm({
        idEmpresa: '',
        esPrincipal: false,
        estado: 1,
      });
    } catch (error: any) {
      alert(error?.message || 'Error asignando empresa al usuario');
    } finally {
      setSavingEmpresa(false);
    }
  };

  const setEmpresaPrincipal = async (usuarioEmpresa: UsuarioEmpresa) => {
    if (!selectedUser?.id) return;

    try {
      await apiFetch(
        `${API_URL}/api/usuarios/${selectedUser.id}/empresas/${usuarioEmpresa.IdUsuarioEmpresa}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            esPrincipal: true,
            estado: usuarioEmpresa.Estado,
          }),
        }
      );

      await loadUserAccess(selectedUser.id);
    } catch (error: any) {
      alert(error?.message || 'Error estableciendo empresa principal');
    }
  };

  const inactivateEmpresa = async (usuarioEmpresa: UsuarioEmpresa) => {
    if (!selectedUser?.id) return;

    if (
      !confirm(
        `¿Desea inactivar la empresa "${usuarioEmpresa.Empresa?.Nombre || ''}" para este usuario?`
      )
    ) {
      return;
    }

    try {
      await apiFetch(
        `${API_URL}/api/usuarios/${selectedUser.id}/empresas/${usuarioEmpresa.IdUsuarioEmpresa}`,
        {
          method: 'DELETE',
        }
      );

      await loadUserAccess(selectedUser.id);
    } catch (error: any) {
      alert(error?.message || 'Error inactivando empresa del usuario');
    }
  };

  // ==========================================================
  // API - ROLES GLOBALES
  // ==========================================================
  const addRolGlobal = async () => {
    if (!selectedUser?.id) return;

    if (!rolGlobalForm.idRol) {
      alert('Seleccione un rol global');
      return;
    }

    setSavingRolGlobal(true);

    try {
      await apiFetch(`${API_URL}/api/usuarios/${selectedUser.id}/roles-global`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idRol: Number(rolGlobalForm.idRol),
          estado: rolGlobalForm.estado,
        }),
      });

      await loadUserAccess(selectedUser.id);

      setRolGlobalForm({
        idRol: '',
        estado: 1,
      });
    } catch (error: any) {
      alert(error?.message || 'Error asignando rol global');
    } finally {
      setSavingRolGlobal(false);
    }
  };

  const inactivateRolGlobal = async (rol: UsuarioRolGlobal) => {
    if (!selectedUser?.id) return;

    if (
      !confirm(`¿Desea inactivar el rol global "${rol.Rol?.Nombre || ''}"?`)
    ) {
      return;
    }

    try {
      await apiFetch(
        `${API_URL}/api/usuarios/${selectedUser.id}/roles-global/${rol.IdUsuarioRolGlobal}`,
        {
          method: 'DELETE',
        }
      );

      await loadUserAccess(selectedUser.id);
    } catch (error: any) {
      alert(error?.message || 'Error inactivando rol global');
    }
  };

  // ==========================================================
  // API - ROLES POR EMPRESA
  // ==========================================================
  const addRolEmpresa = async () => {
    if (!selectedUser?.id || !selectedUsuarioEmpresaId) return;

    if (!rolEmpresaForm.idRol) {
      alert('Seleccione un rol de empresa');
      return;
    }

    setSavingRolEmpresa(true);

    try {
      await apiFetch(
        `${API_URL}/api/usuarios/${selectedUser.id}/empresas/${selectedUsuarioEmpresaId}/roles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idRol: Number(rolEmpresaForm.idRol),
            estado: rolEmpresaForm.estado,
          }),
        }
      );

      await loadUserEmpresaRoles(selectedUser.id, selectedUsuarioEmpresaId);

      setRolEmpresaForm({
        idRol: '',
        estado: 1,
      });
    } catch (error: any) {
      alert(error?.message || 'Error asignando rol por empresa');
    } finally {
      setSavingRolEmpresa(false);
    }
  };

  const inactivateRolEmpresa = async (rol: UsuarioEmpresaRol) => {
    if (!selectedUser?.id || !selectedUsuarioEmpresaId) return;

    if (
      !confirm(`¿Desea inactivar el rol "${rol.Rol?.Nombre || ''}" de esta empresa?`)
    ) {
      return;
    }

    try {
      await apiFetch(
        `${API_URL}/api/usuarios/${selectedUser.id}/empresas/${selectedUsuarioEmpresaId}/roles/${rol.IdUsuarioEmpresaRol}`,
        {
          method: 'DELETE',
        }
      );

      await loadUserEmpresaRoles(selectedUser.id, selectedUsuarioEmpresaId);
    } catch (error: any) {
      alert(error?.message || 'Error inactivando rol de empresa');
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }


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




      <div className="px-6 lg:px-8 py-6 space-y-6">
        <BreadcrumbNavigation
          customSegments={[
            {
              label: 'Configuración',
              href: '#',
              isActive: false,
            },
            {
              label: 'Mantenimiento de Usuarios',
              href: '/user-management',
              isActive: true,
            },
          ]}
        />

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Mantenimiento de Usuarios
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra usuarios, empresas asignadas, roles globales y roles por empresa.
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
                Buscar
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Buscar por usuario, nombre o correo..."
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
                Nuevo Usuario
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{filteredSummary}</p>
        </div>

        {/* Tabla */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loadingUsers ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay usuarios registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Nombre Completo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Correo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Empresas
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Roles Globales
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-foreground">
                            {user.Usuario}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Registro: {formatDate(user.FechaRegistro)}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-foreground">
                        {user.NombreCompleto}
                      </td>

                      <td className="px-4 py-4 align-top text-foreground">
                        {user.Correo || '—'}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadgeClass(
                            user.Estado
                          )}`}
                        >
                          {estadoLabel(user.Estado)}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {(user.EmpresasAsignadas || []).length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                                user.EmpresasAsignadas?.map((empresa) => {
                                const licencia = empresa.Empresa?.Licencia;

                                return (
                                  <span
                                    key={empresa.IdUsuarioEmpresa}
                                    className="inline-flex flex-col gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border bg-muted text-foreground"
                                  >
                                    <span>
                                      {empresa.Empresa?.Nombre || `Empresa #${empresa.IdEmpresa}`}
                                      {empresa.EsPrincipal ? ' • Principal' : ''}
                                    </span>

                                    <span
                                      className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-medium border ${licenciaBadgeClass(
                                        licencia
                                      )}`}
                                    >
                                      {licenciaLabel(licencia)}
                                    </span>
                                  </span>
                                );
                              })
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {(user.RolesGlobales || []).length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            user.RolesGlobales?.map((rol) => (
                              <span
                                key={rol.IdUsuarioRolGlobal}
                                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20"
                              >
                                {rol.Rol?.Nombre || rol.Rol?.Codigo || `Rol #${rol.IdRol}`}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => openAccessModal(user)}
                            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                          >
                            Accesos
                          </button>

                          <button
                            onClick={() => deleteUser(user)}
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
          MODAL CREAR / EDITAR USUARIO
         ====================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>

              <button
                onClick={closeUserModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Usuario *
                  </label>
                  <input
                    type="text"
                    value={userForm.usuario}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        usuario: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado *
                  </label>
                  <select
                    value={userForm.estado}
                    onChange={(e) =>
                      setUserForm((prev) => ({
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={userForm.nombreCompleto}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      nombreCompleto: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Correo
                </label>
                <input
                  type="email"
                  value={userForm.correo}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      correo: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {editingUserId ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={closeUserModal}
                className="px-5 py-2.5 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cancelar
              </button>

              <button
                onClick={saveUser}
                disabled={savingUser}
                className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                {savingUser ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL ACCESOS DEL USUARIO
         ====================================================== */}
      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Accesos de Usuario
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedUser.NombreCompleto} ({selectedUser.Usuario})
                </p>
              </div>

              <button
                onClick={closeAccessModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {loadingAccess ? (
                <div className="text-center text-muted-foreground py-10">
                  Cargando accesos del usuario...
                </div>
              ) : (
                <>
                  {/* EMPRESAS */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Empresas Asignadas
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Asigna empresas al usuario y define cuál es su principal.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                      <select
                        value={empresaForm.idEmpresa}
                        onChange={(e) =>
                          setEmpresaForm((prev) => ({
                            ...prev,
                            idEmpresa: e.target.value,
                          }))
                        }
                        className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="">Seleccione empresa</option>
                        {catalogos.Empresas.map((empresa) => (
                          <option key={empresa.id} value={empresa.id}>
                            {empresa.Nombre}
                          </option>
                        ))}
                      </select>

                      <select
                        value={empresaForm.estado}
                        onChange={(e) =>
                          setEmpresaForm((prev) => ({
                            ...prev,
                            estado: Number(e.target.value) as EstadoValue,
                          }))
                        }
                        className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value={1}>Activo</option>
                        <option value={0}>Inactivo</option>
                      </select>

                      <label className="flex items-center gap-2 px-4 py-3 border border-input rounded-md bg-background text-foreground">
                        <input
                          type="checkbox"
                          checked={empresaForm.esPrincipal}
                          onChange={(e) =>
                            setEmpresaForm((prev) => ({
                              ...prev,
                              esPrincipal: e.target.checked,
                            }))
                          }
                        />
                        Empresa principal
                      </label>

                      <button
                        onClick={addEmpresaToUser}
                        disabled={savingEmpresa}
                        className="px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {savingEmpresa ? 'Guardando...' : 'Asignar Empresa'}
                      </button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      {userEmpresas.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          Este usuario no tiene empresas asignadas.
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Empresa
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Principal
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Estado
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Licencia
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {userEmpresas.map((row) => (
                              <tr
                                key={row.IdUsuarioEmpresa}
                                className={`border-b border-border last:border-b-0 ${
                                  selectedUsuarioEmpresaId === row.IdUsuarioEmpresa
                                    ? 'bg-primary/5'
                                    : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-sm text-foreground">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setSelectedUsuarioEmpresaId(row.IdUsuarioEmpresa);
                                      setSelectedUsuarioEmpresa(row);
                                      await loadUserEmpresaRoles(
                                        selectedUser.id,
                                        row.IdUsuarioEmpresa
                                      );
                                    }}
                                    className="text-left hover:text-primary transition-smooth"
                                  >
                                    {row.Empresa?.Nombre || `Empresa #${row.IdEmpresa}`}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {row.EsPrincipal ? 'Sí' : 'No'}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {estadoLabel(row.Estado)}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${licenciaBadgeClass(
                                        row.Empresa?.Licencia
                                      )}`}
                                    >
                                      {licenciaLabel(row.Empresa?.Licencia)}
                                    </span>

                                    <p className="text-xs text-muted-foreground">
                                      {licenciaDetalleTexto(row.Empresa?.Licencia)}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {!row.EsPrincipal && row.Estado === 1 && (
                                      <button
                                        onClick={() => setEmpresaPrincipal(row)}
                                        className="px-3 py-1.5 text-xs border border-input rounded-md hover:bg-muted transition-smooth"
                                      >
                                        Hacer Principal
                                      </button>
                                    )}

                                    <button
                                      onClick={() => inactivateEmpresa(row)}
                                      className="px-3 py-1.5 text-xs border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
                                    >
                                      Inactivar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>

                  {/* ROLES GLOBALES */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Roles Globales
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Asigna roles de ámbito global al usuario.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <select
                        value={rolGlobalForm.idRol}
                        onChange={(e) =>
                          setRolGlobalForm((prev) => ({
                            ...prev,
                            idRol: e.target.value,
                          }))
                        }
                        className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="">Seleccione rol global</option>
                        {catalogos.RolesGlobales.map((rol) => (
                          <option key={rol.IdRol} value={rol.IdRol}>
                            {rol.Nombre}
                          </option>
                        ))}
                      </select>

                      <select
                        value={rolGlobalForm.estado}
                        onChange={(e) =>
                          setRolGlobalForm((prev) => ({
                            ...prev,
                            estado: Number(e.target.value) as EstadoValue,
                          }))
                        }
                        className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value={1}>Activo</option>
                        <option value={0}>Inactivo</option>
                      </select>

                      <button
                        onClick={addRolGlobal}
                        disabled={savingRolGlobal}
                        className="px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {savingRolGlobal ? 'Guardando...' : 'Asignar Rol Global'}
                      </button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      {userRolesGlobales.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          Este usuario no tiene roles globales asignados.
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                Rol
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
                            {userRolesGlobales.map((row) => (
                              <tr
                                key={row.IdUsuarioRolGlobal}
                                className="border-b border-border last:border-b-0"
                              >
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {row.Rol?.Nombre || row.Rol?.Codigo || `Rol #${row.IdRol}`}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {estadoLabel(row.Estado)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => inactivateRolGlobal(row)}
                                    className="px-3 py-1.5 text-xs border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
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
                  </section>

                  {/* ROLES POR EMPRESA */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Roles por Empresa
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Selecciona una empresa asignada para administrar sus roles.
                      </p>
                    </div>

                    {selectedUsuarioEmpresa ? (
                      <>
                        <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                          <p className="text-sm text-foreground">
                            Empresa seleccionada:{' '}
                            <span className="font-medium">
                              {selectedUsuarioEmpresa.Empresa?.Nombre ||
                                `Empresa #${selectedUsuarioEmpresa.IdEmpresa}`}
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          <select
                            value={rolEmpresaForm.idRol}
                            onChange={(e) =>
                              setRolEmpresaForm((prev) => ({
                                ...prev,
                                idRol: e.target.value,
                              }))
                            }
                            className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                          >
                            <option value="">Seleccione rol empresa</option>
                            {catalogos.RolesEmpresa.map((rol) => (
                              <option key={rol.IdRol} value={rol.IdRol}>
                                {rol.Nombre}
                              </option>
                            ))}
                          </select>

                          <select
                            value={rolEmpresaForm.estado}
                            onChange={(e) =>
                              setRolEmpresaForm((prev) => ({
                                ...prev,
                                estado: Number(e.target.value) as EstadoValue,
                              }))
                            }
                            className="px-4 py-3 border border-input rounded-md bg-background text-foreground"
                          >
                            <option value={1}>Activo</option>
                            <option value={0}>Inactivo</option>
                          </select>

                          <button
                            onClick={addRolEmpresa}
                            disabled={savingRolEmpresa}
                            className="px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                          >
                            {savingRolEmpresa ? 'Guardando...' : 'Asignar Rol Empresa'}
                          </button>
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden">
                          {loadingEmpresaRoles ? (
                            <div className="p-4 text-sm text-muted-foreground">
                              Cargando roles por empresa...
                            </div>
                          ) : userEmpresaRoles.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">
                              No hay roles asignados para esta empresa.
                            </div>
                          ) : (
                            <table className="w-full">
                              <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                    Rol
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
                                {userEmpresaRoles.map((row) => (
                                  <tr
                                    key={row.IdUsuarioEmpresaRol}
                                    className="border-b border-border last:border-b-0"
                                  >
                                    <td className="px-4 py-3 text-sm text-foreground">
                                      {row.Rol?.Nombre || row.Rol?.Codigo || `Rol #${row.IdRol}`}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                      {estadoLabel(row.Estado)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => inactivateRolEmpresa(row)}
                                        className="px-3 py-1.5 text-xs border border-error text-error rounded-md hover:bg-error/10 transition-smooth"
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
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Primero asigna o selecciona una empresa para administrar sus roles.
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end">
              <button
                onClick={closeAccessModal}
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