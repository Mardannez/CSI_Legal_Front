'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from './StatusBadge';

export type StatusOption = {
  id: number;
  label: string;
};

interface StatusDropdownProps {
  currentEstadoId: number;                 // ✅ ahora es ID
  options: StatusOption[];                 // ✅ viene del backend
  onChange: (estadoId: number) => void;    // ✅ devuelve ID
  disabled?: boolean;
}

export default function StatusDropdown({
  currentEstadoId,
  options,
  onChange,
  disabled = false,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Encuentra label del estado actual
  const currentLabel = useMemo(() => {
    return options.find(o => o.id === currentEstadoId)?.label || 'Desconocido';
  }, [options, currentEstadoId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (estadoId: number) => {
    onChange(estadoId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className="flex items-center gap-2 hover:opacity-80 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        title="Cambiar estado"
      >
        {/* StatusBadge sigue recibiendo texto */}
        <StatusBadge status={currentLabel} />

        {!disabled && (
          <Icon
            name={isOpen ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={16}
            className="text-muted-foreground"
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-elevation-2 z-50 py-2">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cambiar Estado
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {options.map((opt) => {
              const isCurrent = opt.id === currentEstadoId;

              return (
                <button
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt.id);
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-muted transition-smooth flex items-center justify-between ${
                    isCurrent ? 'bg-muted/50' : ''
                  }`}
                >
                  <StatusBadge status={opt.label} />
                  {isCurrent && <Icon name="CheckIcon" size={16} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}