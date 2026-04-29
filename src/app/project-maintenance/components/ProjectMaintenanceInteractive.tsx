'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';

interface Project {
  id: string;
  countryId: string;
  name: string;
  type: string;
  description: string;
  requirementCount: number;
  compliancePercentage: number;
  createdDate: string;
}

const mockProjects: Project[] = [
  {
    id: 'coda-001',
    countryId: 'hn',
    name: 'Consultores en Desarrollo y Ambiente (CODA)',
    type: 'Empresa',
    description: 'Consultoría ambiental y desarrollo sostenible',
    requirementCount: 8,
    compliancePercentage: 25,
    createdDate: '2024-01-15'
  },
  {
    id: 'esencia-001',
    countryId: 'hn',
    name: 'Esencia Creativa',
    type: 'Empresa',
    description: 'Agencia de marketing y diseño creativo',
    requirementCount: 8,
    compliancePercentage: 25,
    createdDate: '2024-02-10'
  },
  {
    id: 'mx-001',
    countryId: 'mx',
    name: 'Normativa Laboral Federal',
    type: 'Marco Regulatorio',
    description: 'Cumplimiento de leyes laborales federales mexicanas',
    requirementCount: 15,
    compliancePercentage: 60,
    createdDate: '2023-11-20'
  },
  {
    id: 'mx-002',
    countryId: 'mx',
    name: 'Seguridad e Higiene Industrial',
    type: 'Marco Regulatorio',
    description: 'Normativas de seguridad en el trabajo',
    requirementCount: 12,
    compliancePercentage: 45,
    createdDate: '2023-12-05'
  },
  {
    id: 'ar-001',
    countryId: 'ar',
    name: 'Ley de Contrato de Trabajo',
    type: 'Marco Regulatorio',
    description: 'Regulaciones laborales argentinas',
    requirementCount: 18,
    compliancePercentage: 70,
    createdDate: '2023-10-10'
  },
  {
    id: 'es-001',
    countryId: 'es',
    name: 'Protección de Datos RGPD',
    type: 'Marco Regulatorio',
    description: 'Cumplimiento del Reglamento General de Protección de Datos',
    requirementCount: 25,
    compliancePercentage: 85,
    createdDate: '2023-09-15'
  }
];

const mockCountries = [
  { id: 'hn', name: 'Honduras' },
  { id: 'mx', name: 'México' },
  { id: 'ar', name: 'Argentina' },
  { id: 'es', name: 'España' }
];

const mockUser = {
  name: 'María González',
  email: 'maria.gonzalez@empresa.com',
  role: 'Administrador',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1063ed2f1-1768119249347.png"
};

export default function ProjectMaintenanceInteractive() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    name: '',
    type: 'Empresa',
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

  const handleLogout = () => {
    router.push('/login');
  };

  const handleAddNew = () => {
    if (!selectedCountry) {
      alert('Por favor seleccione un país primero');
      return;
    }
    setEditingProject(null);
    setFormData({ name: '', type: 'Empresa', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      type: project.type,
      description: project.description
    });
    setIsModalOpen(true);
  };

  const handleDelete = (projectId: string) => {
    setDeleteConfirmId(projectId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setProjects(projects.filter(p => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleDuplicate = (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: `${project.id}-copy-${Date.now()}`,
      name: `${project.name} (Copia)`,
      createdDate: new Date().toISOString().split('T')[0]
    };
    setProjects([...projects, duplicatedProject]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProject) {
      setProjects(projects.map(p => 
        p.id === editingProject.id 
          ? { ...p, name: formData.name, type: formData.type, description: formData.description }
          : p
      ));
    } else {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        countryId: selectedCountry,
        name: formData.name,
        type: formData.type,
        description: formData.description,
        requirementCount: 0,
        compliancePercentage: 0,
        createdDate: new Date().toISOString().split('T')[0]
      };
      setProjects([...projects, newProject]);
    }
    
    setIsModalOpen(false);
    setFormData({ name: '', type: 'Empresa', description: '' });
  };

  const filteredProjects = projects.filter(project => {
    const matchesCountry = !selectedCountry || project.countryId === selectedCountry;
    const matchesSearch = !searchQuery || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || project.type === filterType;
    return matchesCountry && matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const projectTypes = Array.from(new Set(projects.map(p => p.type)));

  if (!isHydrated) {
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="BriefcaseIcon" size={24} className="text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Mantenimiento de Proyectos</h1>
                  <p className="text-xs text-muted-foreground font-caption">Administración</p>
                </div>
              </div>
            </div>
            <UserContextMenu user={mockUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <BreadcrumbNavigation />

        <div className="mt-6">
          <div className="bg-card rounded-lg border border-border shadow-elevation-1">
            {/* Filters Section */}
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Proyectos</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto' : 'proyectos'}
                  </p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
                >
                  <Icon name="PlusIcon" size={20} />
                  <span className="font-medium">Crear Proyecto</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    País <span className="text-error">*</span>
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  >
                    <option value="">Todos los países</option>
                    {mockCountries.map(country => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo de Proyecto
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  >
                    <option value="">Todos los tipos</option>
                    {projectTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar proyecto..."
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

            {/* Table Section */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nombre</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Requisitos</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Cumplimiento</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Fecha Creación</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/50 transition-smooth">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                          {project.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">{project.requirementCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${project.compliancePercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{project.compliancePercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(project.createdDate).toLocaleDateString('es-ES')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(project)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                            title="Editar"
                          >
                            <Icon name="PencilIcon" size={18} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(project)}
                            className="p-2 text-muted-foreground hover:text-secondary hover:bg-muted rounded-md transition-smooth"
                            title="Duplicar"
                          >
                            <Icon name="DocumentDuplicateIcon" size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
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

            {filteredProjects.length === 0 && (
              <div className="p-12 text-center">
                <Icon name="BriefcaseIcon" size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron proyectos</p>
                {!selectedCountry && (
                  <p className="text-sm text-muted-foreground mt-2">Seleccione un país para ver los proyectos</p>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredProjects.length)} de {filteredProjects.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon name="ChevronLeftIcon" size={20} />
                    </button>
                    <span className="text-sm text-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
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
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre del Proyecto <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    placeholder="Ingrese el nombre del proyecto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  >
                    <option value="Empresa">Empresa</option>
                    <option value="Marco Regulatorio">Marco Regulatorio</option>
                    <option value="Sector Industrial">Sector Industrial</option>
                    <option value="Dominio de Cumplimiento">Dominio de Cumplimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción <span className="text-error">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                    placeholder="Describa el proyecto..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
                >
                  {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                  <Icon name="ExclamationTriangleIcon" size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Confirmar Eliminación</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ¿Está seguro de eliminar este proyecto? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-smooth"
                >
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