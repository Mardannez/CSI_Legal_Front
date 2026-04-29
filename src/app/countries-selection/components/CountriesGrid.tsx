'use client';

import CountryCard from './CountryCard';

interface Country {
  id: string;
  name: string;
  flagUrl: string;
  description: string;
  companyCount: number;
}

interface CountriesGridProps {
  countries: Country[];
  onCountrySelect: (countryId: string) => void;
}

export default function CountriesGrid({ countries, onCountrySelect }: CountriesGridProps) {
  if (countries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No se encontraron países
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No hay países que coincidan con tu búsqueda. Intenta con otros términos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {countries.map((country) => (
        <CountryCard
          key={country.id}
          country={country}
          onSelect={onCountrySelect}
        />
      ))}
    </div>
  );
}