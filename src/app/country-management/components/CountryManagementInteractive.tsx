'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';

interface Country {
  id: string;
  name: string;
  flagUrl: string;
  description: string;
  projectCount: number;
}

interface CountryFormData {
  name: string;
  flagUrl: string;
  description: string;
}

const mockCountries: Country[] = [
  {
    id: 'hn',
    name: 'Honduras',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_134246877-1771034523081.png",
    description: 'Marco legal laboral y seguridad social para cumplimiento empresarial en Honduras',
    projectCount: 2
  },
  {
    id: 'es',
    name: 'España',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1619a7951-1766842603704.png",
    description: 'Marco regulatorio completo para cumplimiento legal empresarial en territorio español',
    projectCount: 12
  },
  {
    id: 'mx',
    name: 'México',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_14394bc06-1766060653077.png",
    description: 'Requisitos legales y normativas para operaciones comerciales en México',
    projectCount: 8
  },
  {
    id: 'ar',
    name: 'Argentina',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1cd99a436-1771013882937.png",
    description: 'Sistema de cumplimiento normativo para empresas en Argentina',
    projectCount: 6
  },
  {
    id: 'cl',
    name: 'Chile',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_14394bc06-1766060653077.png",
    description: 'Regulaciones y requisitos legales para operaciones en Chile',
    projectCount: 10
  },
  {
    id: 'co',
    name: 'Colombia',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1028765bb-1764861124893.png",
    description: 'Marco legal y normativo para cumplimiento empresarial en Colombia',
    projectCount: 7
  },
  {
    id: 'pe',
    name: 'Perú',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_14394bc06-1766060653077.png",
    description: 'Requisitos de cumplimiento legal para empresas operando en Perú',
    projectCount: 5
  },
  {
    id: 'br',
    name: 'Brasil',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_17feeb7be-1768797707212.png",
    description: 'Sistema completo de regulaciones empresariales para Brasil',
    projectCount: 15
  },
  {
    id: 'uy',
    name: 'Uruguay',
    flagUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1bf8d7cdb-1768047934984.png",
    description: 'Marco normativo para cumplimiento legal en Uruguay',
    projectCount: 4
  }
];

const mockUser = {
  name: 'María González',
  email: 'maria.gonzalez@empresa.com',
  role: 'Gerente de Cumplimiento',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1063ed2f1-1768119249347.png"
};

export default function CountryManagementInteractive() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [countries, setCountries] = useState<Country[]>(mockCountries);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();

  const [formData, setFormData] = useState<CountryFormData>({
    name: '',
    flagUrl: '',
    description: ''
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCountries = filteredCountries.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenModal = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setFormData({
        name: country.name,
        flagUrl: country.flagUrl,
        description: country.description
      });
    } else {
      setEditingCountry(null);
      setFormData({ name: '', flagUrl: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCountry(null);
    setFormData({ name: '', flagUrl: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (editingCountry) {
      setCountries(countries.map(c => 
        c.id === editingCountry.id 
          ? { ...c, ...formData }
          : c
      ));
    } else {
      const newCountry: Country = {
        id: `country-${Date.now()}`,
        ...formData,
        projectCount: 0
      };
      setCountries([...countries, newCountry]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (countryId: string) => {
    if (confirm('¿Está seguro de eliminar este país? Esta acción no se puede deshacer.')) {
      setCountries(countries.filter(c => c.id !== countryId));
    }
  };

  const handleDuplicate = (country: Country) => {
    const duplicated: Country = {
      ...country,
      id: `country-${Date.now()}`,
      name: `${country.name} (Copia)`,
      projectCount: 0
    };
    setCountries([...countries, duplicated]);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <UserContextMenu user={mockUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-6 py-6">
        <BreadcrumbNavigation />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Países</h1>
          <p className="text-muted-foreground">Administre los países y sus configuraciones regionales</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar países..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                />
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nuevo País</span>
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elevation-1">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Bandera</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nombre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Descripción</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Proyectos</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCountries.map((country) => (
                  <tr key={country.id} className="hover:bg-muted/50 transition-smooth">
                    <td className="px-6 py-4">
                      <AppImage
                        src={country.flagUrl}
                        alt={`Bandera de ${country.name}`}
                        width={48}
                        height={32}
                        className="rounded object-cover"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{country.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground line-clamp-2">{country.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {country.projectCount} proyectos
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(country)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                          title="Editar"
                        >
                          <Icon name="PencilIcon" size={18} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(country)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                          title="Duplicar"
                        >
                          <Icon name="DocumentDuplicateIcon" size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(country.id)}
                          className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                          title="Eliminar"
                        >
                          <Icon name="TrashIcon" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border">
            {paginatedCountries.map((country) => (
              <div key={country.id} className="p-4 hover:bg-muted/50 transition-smooth">
                <div className="flex items-start gap-4 mb-3">
                  <AppImage
                    src={country.flagUrl}
                    alt={`Bandera de ${country.name}`}
                    width={48}
                    height={32}
                    className="rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">{country.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{country.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {country.projectCount} proyectos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(country)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                    >
                      <Icon name="PencilIcon" size={18} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(country)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                    >
                      <Icon name="DocumentDuplicateIcon" size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(country.id)}
                      className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                    >
                      <Icon name="TrashIcon" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCountries.length)} de {filteredCountries.length} países
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="ChevronLeftIcon" size={20} />
                  </button>
                  <span className="text-sm font-medium text-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
                {editingCountry ? 'Editar País' : 'Nuevo País'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre del País <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    placeholder="Ej: Honduras"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    URL de la Bandera
                  </label>
                  <input
                    type="url"
                    value={formData.flagUrl}
                    onChange={(e) => setFormData({ ...formData, flagUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    placeholder="https://ejemplo.com/bandera.png"
                  />
                  {formData.flagUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                      <AppImage
                        src={formData.flagUrl}
                        alt="Vista previa de bandera"
                        width={80}
                        height={53}
                        className="rounded object-cover border border-border"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción de Actividades <span className="text-error">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                    placeholder="Describa las actividades y marco regulatorio del país"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
                >
                  {editingCountry ? 'Guardar Cambios' : 'Crear País'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}