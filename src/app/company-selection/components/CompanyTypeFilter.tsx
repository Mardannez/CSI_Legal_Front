'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CompanyTypeFilterProps {
  types: string[];
  selectedType: string;
  onTypeSelect: (type: string) => void;
}

export default function CompanyTypeFilter({ types, selectedType, onTypeSelect }: CompanyTypeFilterProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTypeSelect = (type: string) => {
    onTypeSelect(type);
    setIsOpen(false);
  };

  if (!isHydrated) {
    return (
      <div className="relative">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-smooth"
        >
          <Icon name="FunnelIcon" size={20} className="text-muted-foreground" />
          <span className="text-foreground">Tipo: Todos</span>
          <Icon name="ChevronDownIcon" size={16} className="text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filtrar por tipo de proyecto"
      >
        <Icon name="FunnelIcon" size={20} className="text-muted-foreground" />
        <span className="text-foreground">Tipo: {selectedType}</span>
        <Icon 
          name="ChevronDownIcon" 
          size={16} 
          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-elevation-2 py-2 z-50">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-smooth ${
                selectedType === type ? 'bg-muted text-primary font-medium' : 'text-popover-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{type}</span>
                {selectedType === type && (
                  <Icon name="CheckIcon" size={16} className="text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}