'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FilterOptions {
  status: string[];
  responsible: string[];
  periodicity: string[];
}

interface ItemsTableFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (filters: ActiveFilters) => void;
  onSearchChange: (search: string) => void;
}

interface ActiveFilters {
  status: string;
  responsible: string;
  periodicity: string;
}

export default function ItemsTableFilters({ 
  filterOptions, 
  onFilterChange, 
  onSearchChange 
}: ItemsTableFiltersProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    status: '',
    responsible: '',
    periodicity: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleFilterChange = (filterType: keyof ActiveFilters, value: string) => {
    const newFilters = { ...activeFilters, [filterType]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { status: '', responsible: '', periodicity: '' };
    setActiveFilters(emptyFilters);
    setSearchTerm('');
    onFilterChange(emptyFilters);
    onSearchChange('');
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '') || searchTerm !== '';

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon 
            name="MagnifyingGlassIcon" 
            size={20} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-input rounded-md bg-background text-foreground hover:bg-muted transition-smooth"
        >
          <Icon name="FunnelIcon" size={20} />
          <span className="font-medium">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {Object.values(activeFilters).filter(v => v !== '').length + (searchTerm ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                value={activeFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="">Todos los estados</option>
                {filterOptions.status.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Responsable
              </label>
              <select
                value={activeFilters.responsible}
                onChange={(e) => handleFilterChange('responsible', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="">Todos los responsables</option>
                {filterOptions.responsible.map((responsible) => (
                  <option key={responsible} value={responsible}>
                    {responsible}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Periodicidad
              </label>
              <select
                value={activeFilters.periodicity}
                onChange={(e) => handleFilterChange('periodicity', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="">Todas las periodicidades</option>
                {filterOptions.periodicity.map((periodicity) => (
                  <option key={periodicity} value={periodicity}>
                    {periodicity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Icon name="XMarkIcon" size={16} />
                <span>Limpiar filtros</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}