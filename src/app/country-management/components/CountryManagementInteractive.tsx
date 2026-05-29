'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Country {
  id: number;
  Pais: string;
  Bandera: string | null;
  DescripcionActividades: string;
  FechaRegistro?: string | null;
}

interface CountryFormData {
  Pais: string;
  Bandera: string;
  DescripcionActividades: string;
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-ES');
}

export default function CountryManagementInteractive() {
  const router = useRouter();
  const { session, logout, loading: authLoading } = useAuth();

  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CountryFormData>({
    Pais: '',
    Bandera: '',
    DescripcionActividades: '',
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
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

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
    setError(null);

    try {
      const json = await fetchJson(`${API_URL}/api/paises`);
      setCountries((json?.Paises || json?.paises || []) as Country[]);
    } catch (e: any) {
      setError(e?.message || 'Error cargando paises');
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !authChecked) return;
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, authChecked]);

  const filteredCountries = countries.filter((country) => {
    const query = searchQuery.toLowerCase();
    return (
      country.Pais.toLowerCase().includes(query) ||
      (country.DescripcionActividades || '').toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCountries.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCountries = filteredCountries.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenModal = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setFormData({
        Pais: country.Pais || '',
        Bandera: country.Bandera || '',
        DescripcionActividades: country.DescripcionActividades || '',
      });
    } else {
      setEditingCountry(null);
      setFormData({ Pais: '', Bandera: '', DescripcionActividades: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCountry(null);
    setFormData({ Pais: '', Bandera: '', DescripcionActividades: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.Pais.trim() || !formData.DescripcionActividades.trim()) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const payload = {
      Pais: formData.Pais.trim(),
      Bandera: formData.Bandera.trim() || null,
      DescripcionActividades: formData.DescripcionActividades.trim(),
    };

    setSaving(true);
    setError(null);

    try {
      if (editingCountry) {
        await fetchJson(`${API_URL}/api/paises/${editingCountry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson(`${API_URL}/api/paises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      handleCloseModal();
      await loadCountries();
    } catch (e: any) {
      alert(e?.message || 'Error guardando pais');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (country: Country) => {
    if (!confirm(`Desea eliminar el pais "${country.Pais}"?`)) return;

    try {
      await fetchJson(`${API_URL}/api/paises/${country.id}`, {
        method: 'DELETE',
      });
      await loadCountries();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando pais');
    }
  };

  const handleDuplicate = async (country: Country) => {
    try {
      await fetchJson(`${API_URL}/api/paises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Pais: `${country.Pais} (Copia)`,
          Bandera: country.Bandera || null,
          DescripcionActividades: country.DescripcionActividades || '',
        }),
      });
      await loadCountries();
    } catch (e: any) {
      alert(e?.message || 'Error duplicando pais');
    }
  };

  const handleBackToCountries = () => {
    router.push('/countries-selection');
  };

  if (!isHydrated || authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <AppImage
              src="/assets/images/CSI-LOGO-05-1771034129124.png"
              alt="CSISL Logo"
              width={120}
              height={40}
              className="object-contain"
            />
            <UserContextMenu user={currentUser} onLogout={logout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-6 py-6">
        <BreadcrumbNavigation />

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Gestion de Paises</h1>
            <p className="text-muted-foreground">Administre los paises y sus descripciones de actividades</p>
          </div>

          <button
            onClick={handleBackToCountries}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-smooth"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            <span className="font-medium">Volver a Paises</span>
          </button>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar paises..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                />
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nuevo Pais</span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-error/10 border border-error rounded-md p-4 text-error mb-6">
            {error}
          </div>
        ) : null}

        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elevation-1">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Bandera</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Pais</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Descripcion Actividades</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Fecha Registro</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCountries ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Cargando paises...
                    </td>
                  </tr>
                ) : paginatedCountries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No se encontraron paises
                    </td>
                  </tr>
                ) : (
                  paginatedCountries.map((country) => (
                    <tr key={country.id} className="hover:bg-muted/50 transition-smooth">
                      <td className="px-6 py-4">
                        {country.Bandera ? (
                          <AppImage
                            src={country.Bandera}
                            alt={`Bandera de ${country.Pais}`}
                            width={48}
                            height={32}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-8 rounded bg-muted border border-border flex items-center justify-center">
                            <Icon name="FlagIcon" size={16} className="text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">{country.Pais}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {country.DescripcionActividades}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{formatDate(country.FechaRegistro)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(country)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth" title="Editar">
                            <Icon name="PencilIcon" size={18} />
                          </button>
                          <button onClick={() => handleDuplicate(country)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth" title="Duplicar">
                            <Icon name="DocumentDuplicateIcon" size={18} />
                          </button>
                          <button onClick={() => handleDelete(country)} className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth" title="Eliminar">
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

          <div className="md:hidden divide-y divide-border">
            {paginatedCountries.map((country) => (
              <div key={country.id} className="p-4 hover:bg-muted/50 transition-smooth">
                <div className="flex items-start gap-4 mb-3">
                  {country.Bandera ? (
                    <AppImage src={country.Bandera} alt={`Bandera de ${country.Pais}`} width={48} height={32} className="rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-8 rounded bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      <Icon name="FlagIcon" size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">{country.Pais}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{country.DescripcionActividades}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(country.FechaRegistro)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => handleOpenModal(country)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth">
                    <Icon name="PencilIcon" size={18} />
                  </button>
                  <button onClick={() => handleDuplicate(country)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth">
                    <Icon name="DocumentDuplicateIcon" size={18} />
                  </button>
                  <button onClick={() => handleDelete(country)} className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth">
                    <Icon name="TrashIcon" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCountries.length)} de {filteredCountries.length} paises
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="ChevronLeftIcon" size={20} />
                  </button>
                  <span className="text-sm font-medium text-foreground px-3">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="ChevronRightIcon" size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingCountry ? 'Editar Pais' : 'Nuevo Pais'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth">
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Pais <span className="text-error">*</span>
                  </label>
                  <input type="text" required value={formData.Pais} onChange={(e) => setFormData({ ...formData, Pais: e.target.value })} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth" placeholder="Ej: Honduras" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">URL de Bandera</label>
                  <input type="url" value={formData.Bandera} onChange={(e) => setFormData({ ...formData, Bandera: e.target.value })} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth" placeholder="https://ejemplo.com/bandera.png" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripcion Actividades <span className="text-error">*</span>
                  </label>
                  <textarea required value={formData.DescripcionActividades} onChange={(e) => setFormData({ ...formData, DescripcionActividades: e.target.value })} rows={4} className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none" placeholder="Describa las actividades del pais" />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth" disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1 disabled:opacity-50">
                  {saving ? 'Guardando...' : editingCountry ? 'Guardar Cambios' : 'Crear Pais'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
