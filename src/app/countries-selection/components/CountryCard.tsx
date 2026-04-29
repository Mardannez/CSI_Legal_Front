'use client';

import { useMemo, useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { getCountryFlag } from '@/utils/countryFlags';

interface CountryCardProps {
  country: {
    id: string;
    name: string;
    flagUrl: string; // puede venir vacío ""
    description: string;
    companyCount: number;
  };
  onSelect: (countryId: string) => void;
}

export default function CountryCard({ country, onSelect }: CountryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const resolvedFlagUrl = useMemo(() => {
    return country.flagUrl || getCountryFlag(country.name, country.id);
  }, [country.flagUrl, country.name, country.id]);

  return (
    <button
      onClick={() => onSelect(country.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-elevation-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-left"
      aria-label={`Seleccionar ${country.name}`}
    >
      <div className="relative h-40 w-full overflow-hidden bg-muted">
  {resolvedFlagUrl ? (
    <>
      <AppImage
        src={resolvedFlagUrl}
        alt={`Bandera de ${country.name}`}
        fill
        className={`object-contain p-3 transition-transform duration-300 ${
          isHovered ? 'scale-110' : 'scale-100'
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </>
  ) : (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="FlagIcon" size={22} />
        <span className="text-sm">Sin bandera</span>
      </div>
    </div>
  )}
</div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-foreground">{country.name}</h3>
          <Icon
            name="ChevronRightIcon"
            size={20}
            className={`text-primary transition-transform duration-300 ${
              isHovered ? 'translate-x-1' : 'translate-x-0'
            }`}
          />
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {country.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="FolderIcon" size={16} className="text-primary" />
          <span>
            {country.companyCount} {country.companyCount === 1 ? 'empresa' : 'empresas'} disponibles
          </span>
        </div>
      </div>
    </button>
  );
}