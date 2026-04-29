'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Buscar proyecto..." }: SearchBarProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  if (!isHydrated) {
    return (
      <div className="relative w-full max-w-md">
        <div className="relative">
          <Icon
            name="MagnifyingGlassIcon"
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value=""
            placeholder={placeholder}
            disabled
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-smooth"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Icon
          name="MagnifyingGlassIcon"
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-smooth"
          aria-label="Buscar proyectos"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
            aria-label="Limpiar búsqueda"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        )}
      </div>
    </div>
  );
}