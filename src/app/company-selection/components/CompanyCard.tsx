'use client';

import { useMemo, useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { getCompanyImage } from '@/utils/companyImages';

interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    countryCode: string;
    countryName: string;
    flagUrl: string;
    itemCount: number;
    compliancePercentage: number;
    companyType: string;
    logoUrl?: string;
  };
  onSelect: (companyId: string) => void;
}

export default function CompanyCard({ company, onSelect }: CompanyCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const resolvedImageUrl = useMemo(() => {
    return company.logoUrl || getCompanyImage(company.name, company.id);
  }, [company.logoUrl, company.name, company.id]);

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-success';
    if (percentage >= 70) return 'text-warning';
    return 'text-error';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-success';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-error';
  };

  return (
    <button
      onClick={() => onSelect(company.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-elevation-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-left"
      aria-label={`Seleccionar proyecto ${company.name}`}
    >
      <div className="relative h-32 w-full overflow-hidden bg-muted">
        {resolvedImageUrl ? (
          <AppImage
            src={resolvedImageUrl}
            alt={`Imagen de ${company.name}`}
            fill
            className={`object-contain p-1 bg-white/20 backdrop-blur-sm  ${
              isHovered ? 'scale-105' : 'scale-100'
            }`}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="PhotoIcon" size={20} />
              <span className="text-sm">Sin imagen</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-block px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-gray-900">
            {company.countryName}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground line-clamp-2 flex-1">
            {company.name}
          </h3>
          <Icon
            name="ChevronRightIcon"
            size={20}
            className={`text-primary transition-transform duration-300 flex-shrink-0 ml-2 ${
              isHovered ? 'translate-x-1' : 'translate-x-0'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block px-2 py-1 bg-muted rounded text-xs font-medium text-muted-foreground">
            {company.companyType}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Icon name="DocumentTextIcon" size={16} className="text-primary" />
          <span>
            {company.itemCount} {company.itemCount === 1 ? 'requisito' : 'requisitos'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cumplimiento</span>
            <span className={`font-bold ${getComplianceColor(company.compliancePercentage)}`}>
              {company.compliancePercentage}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor(company.compliancePercentage)}`}
              style={{ width: `${company.compliancePercentage}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}