'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CountryOption {
  id: number;
  Pais: string;
}

interface Company {
  IdEmpresa: number;
  Empresa: string;
  Tipo: string;
  Pais: string;
  CantidadRequi: number;
  IdUsuario?: number | null;
  Estado: number;
  LbEstado: string;
  IdPais?: number | null;
}

interface CompanyFormData {
  Empresa: string;
  Tipo: string;
  IdPais: string;
  Estado: string;
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

export default function ProjectMaintenanceInteractive() {
  const router = useRouter();
  const { session, logout, loading: authLoading } = useAuth();

  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CompanyFormData>({
    Empresa: '',
    Tipo: '',
    IdPais: '',
    Estado: '1',
  });

  const currentUser = useMemo(
    () => ({
      name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
      email: session?.user.correo || session?.user.usuario || '',
      role: session?.isGlobalAdmin
        ? 'SUPER_ADMIN'
        : session?.empresas?.[0]?.roles?.join(', ') || 'Usuario',
      avatar: '',
      isGlobalAdmin: !!session?.isGlobalAdmin,
    }),
    [session]
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    setAuthChecked(true);
  }, [isHydrated, authLoading, session, router]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen || deleteConfirmId ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, deleteConfirmId]);

  const fetchJson = async (url: string, init?: RequestInit) => {
    const token = getToken();

    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await response.text();
    let json: any = {};

    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }

    if (response.status === 401) {
      logout();
      throw new Error('Sesion expirada');
    }

    if (!response.ok || json?.ok === false) {
      throw new Error(json?.message || `Error HTTP ${response.status}`);
    }

    return json;
  };

  const loadCountries = async () => {
    setLoadingCountries(true);

    try {
      const json = await fetchJson(`${API_URL}/api/paises`);
      setCountries((json?.Paises || json?.paises || []) as CountryOption[]);
    } catch (e: any) {
      setError(e?.message || 'Error cargando paises');
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      const json = await fetchJson(`${API_URL}/api/empresas`);
      setCompanies((json?.Empresas || json?.empresas || []).map(normalizeCompany));
    } catch (e: any) {
      setError(e?.message || 'Error cargando empresas');
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !authChecked) return;
    loadCountries();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, authChecked]);

  const getCountryIdByName = (countryName?: string | null) => {
    const normalizedName = String(countryName || '').trim().toLowerCase();
    if (!normalizedName) return null;

    const country = countries.find(
      (item) => item.Pais.trim().toLowerCase() === normalizedName
    );

    return country?.id || null;
  };

  const normalizeCompany = (row: any): Company => {
    const idPais = Number(row?.IdPais ?? row?.idPais) || getCountryIdByName(row?.Pais);

    return {
      IdEmpresa: Number(row?.IdEmpresa ?? row?.id ?? row?.idEmpresa),
      Empresa: String(row?.Empresa ?? row?.Nombre ?? ''),
      Tipo: String(row?.Tipo ?? row?.tipo ?? ''),
      Pais: String(row?.Pais ?? getCountryName(idPais || 0)),
      CantidadRequi: Number(row?.CantidadRequi ?? row?.cantidadRequi ?? row?.CantidadRequisitos ?? 0),
      IdUsuario: row?.IdUsuario ?? row?.idUsuario ?? null,
      Estado: Number(row?.Estado ?? 0),
      LbEstado: String(
        row?.LbEstado ??
          row?.lbEstado ??
          (Number(row?.Estado ?? 0) === 1 ? 'Activa' : 'Inactiva')
      ),
      IdPais: idPais,
    };
  };

  const getCountryName = (countryId: number) =>
    countries.find((country) => Number(country.id) === Number(countryId))?.Pais ||
    `ID ${countryId}`;

  const filteredCompanies = companies.filter((company) => {
    const companyCountryId = company.IdPais || getCountryIdByName(company.Pais);
    const matchesCountry = !selectedCountry || Number(companyCountryId) === Number(selectedCountry);
    const matchesSearch =
      !searchQuery ||
      company.Empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.Pais.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || String(company.Estado) === filterStatus;
    return matchesCountry && matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handleBackToCountries = () => {
    router.push('/countries-selection');
  };

  const handleAddNew = () => {
    setEditingCompany(null);
    setFormData({
      Empresa: '',
      Tipo: '',
      IdPais: selectedCountry || '',
      Estado: '1',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      Empresa: company.Empresa || '',
      Tipo: company.Tipo || '',
      IdPais: String(company.IdPais || getCountryIdByName(company.Pais) || ''),
      Estado: String(company.Estado ?? 1),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    setFormData({
      Empresa: '',
      Tipo: '',
      IdPais: '',
      Estado: '1',
    });
  };

  const buildPayload = () => ({
    Empresa: formData.Empresa.trim(),
    Nombre: formData.Empresa.trim(),
    Tipo: formData.Tipo.trim(),
    IdPais: Number(formData.IdPais),
    IdUsuario: editingCompany?.IdUsuario || session?.user.id || 1,
    Estado: Number(formData.Estado),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.Empresa.trim() || !formData.Tipo.trim() || !formData.IdPais) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingCompany) {
        await fetchJson(`${API_URL}/api/empresas/${editingCompany.IdEmpresa}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
      } else {
        await fetchJson(`${API_URL}/api/empresas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
      }

      handleCloseModal();
      await loadCompanies();
    } catch (e: any) {
      alert(e?.message || 'Error guardando empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (company: Company) => {
    try {
      await fetchJson(`${API_URL}/api/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Empresa: `${company.Empresa} (Copia)`,
          Nombre: `${company.Empresa} (Copia)`,
          Tipo: company.Tipo,
          IdPais: Number(company.IdPais || getCountryIdByName(company.Pais)),
          IdUsuario: company.IdUsuario || session?.user.id || 1,
          Estado: Number(company.Estado ?? 1),
        }),
      });
      await loadCompanies();
    } catch (e: any) {
      alert(e?.message || 'Error duplicando empresa');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await fetchJson(`${API_URL}/api/empresas/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      setDeleteConfirmId(null);
      await loadCompanies();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando empresa');
    }
  };

  if (!isHydrated || authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 bg-card border-b border-border animate-pulse" />
        <div className="container mx-auto px-4 py-8">
          <div className="h-96 bg-card rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-elevation-1 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="BuildingOfficeIcon" size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Mantenimiento de Empresas</h1>
                <p className="text-xs text-muted-foreground font-caption">Administracion</p>
              </div>
            </div>
            <UserContextMenu user={currentUser} onLogout={logout} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <BreadcrumbNavigation />

        <div className="mt-6">
          <div className="bg-card rounded-lg border border-border shadow-elevation-1">
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Empresas</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredCompanies.length} {filteredCompanies.length === 1 ? 'empresa' : 'empresas'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <button onClick={handleBackToCountries} className="flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-smooth">
                    <Icon name="ArrowLeftIcon" size={18} />
                    <span className="font-medium">Volver a Paises</span>
                  </button>
                  <button onClick={handleAddNew} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1">
                    <Icon name="PlusIcon" size={20} />
                    <span className="font-medium">Crear Empresa</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pais</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    disabled={loadingCountries}
                  >
                    <option value="">Todos los paises</option>
                    {countries.map((country, index) => (
                      <option key={`filter-country-${country.id}-${index}`} value={country.id}>
                        {country.Pais}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  >
                    <option value="">Todos los estados</option>
                    <option value="1">Activa</option>
                    <option value="0">Inactiva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Buscar</label>
                  <div className="relative">
                    <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar empresa..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="m-6 bg-error/10 border border-error rounded-md p-4 text-error">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Empresa</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Pais</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Requisitos</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Estado</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingCompanies ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Cargando empresas...</td>
                    </tr>
                  ) : paginatedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No se encontraron empresas</td>
                    </tr>
                  ) : (
                    paginatedCompanies.map((company, index) => (
                      <tr
                        key={`company-${company.IdEmpresa ?? 'no-id'}-${startIndex + index}`}
                        className="hover:bg-muted/50 transition-smooth"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-foreground">{company.Empresa}</p>
                            <p className="text-sm text-muted-foreground">ID: {company.IdEmpresa}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{company.Pais}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{company.CantidadRequi}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Number(company.Estado) === 1 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {company.LbEstado || (Number(company.Estado) === 1 ? 'Activa' : 'Inactiva')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(company)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth" title="Editar">
                              <Icon name="PencilIcon" size={18} />
                            </button>
                            <button onClick={() => handleDuplicate(company)} className="p-2 text-muted-foreground hover:text-secondary hover:bg-muted rounded-md transition-smooth" title="Duplicar">
                              <Icon name="DocumentDuplicateIcon" size={18} />
                            </button>
                            <button onClick={() => setDeleteConfirmId(company.IdEmpresa)} className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth" title="Eliminar">
                              <Icon name="TrashIcon" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCompanies.length)} de {filteredCompanies.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed">
                      <Icon name="ChevronLeftIcon" size={20} />
                    </button>
                    <span className="text-sm text-foreground">Pagina {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed">
                      <Icon name="ChevronRightIcon" size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">{editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
              <button onClick={handleCloseModal} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth">
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pais <span className="text-error">*</span></label>
                  <select required value={formData.IdPais} onChange={(e) => setFormData({ ...formData, IdPais: e.target.value })} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth">
                    <option value="">Seleccione un pais</option>
                    {countries.map((country, index) => (
                      <option key={`form-country-${country.id}-${index}`} value={country.id}>{country.Pais}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Empresa <span className="text-error">*</span></label>
                  <input type="text" required value={formData.Empresa} onChange={(e) => setFormData({ ...formData, Empresa: e.target.value })} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth" placeholder="Ingrese el nombre de la empresa" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tipo <span className="text-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.Tipo}
                      onChange={(e) => setFormData({ ...formData, Tipo: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                      placeholder="Ej: Empresa Camaronera"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Estado <span className="text-error">*</span></label>
                    <select required value={formData.Estado} onChange={(e) => setFormData({ ...formData, Estado: e.target.value })} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth">
                      <option value="1">Activa</option>
                      <option value="0">Inactiva</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth" disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1 disabled:opacity-50">
                  {saving ? 'Guardando...' : editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                  <Icon name="ExclamationTriangleIcon" size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Confirmar Eliminacion</h3>
                  <p className="text-sm text-muted-foreground mt-1">Desea eliminar esta empresa? Esta accion no se puede deshacer.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth">
                  Cancelar
                </button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-smooth">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
