'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BreadcrumbSegment {
  label: string;
  href: string;
  isActive: boolean;
}

interface BreadcrumbNavigationProps {
  customSegments?: BreadcrumbSegment[];
  className?: string;
}

const BreadcrumbNavigation = ({
  customSegments,
  className = '',
}: BreadcrumbNavigationProps) => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    if (customSegments) {
      return customSegments;
    }

    const segments: BreadcrumbSegment[] = [];
    const pathParts = pathname.split('/').filter(Boolean);

    const routeMap: Record<string, string> = {
      login: 'Iniciar Sesión',
      'countries-selection': 'Países',
      'company-selection': 'Proyectos',
      'company-dashboard': 'Panel de Cumplimiento Legal',
      'country-management': 'Gestión de Países',
      'project-maintenance': 'Mantenimiento de Proyectos',
      'requirements-maintenance': 'Mantenimiento de Requisitos',
      'user-management': 'Mantenimiento de Usuarios',
      'roles-management': 'Mantenimiento de Roles',
      'permissions-management': 'Mantenimiento de Permisos',
    };

    let currentPath = '';

    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isLast = index === pathParts.length - 1;

      segments.push({
        label: routeMap[part] || part.charAt(0).toUpperCase() + part.slice(1),
        href: currentPath,
        isActive: isLast,
      });
    });

    if (segments.length === 0) {
      segments.push({
        label: 'Inicio',
        href: '/',
        isActive: true,
      });
    }

    return segments;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`relative flex items-center gap-2 py-4 ${className}`}
    >
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((segment, index) => (
          <div key={segment.href} className="flex items-center gap-2">
            {index > 0 && (
              <Icon
                name="ChevronRightIcon"
                size={16}
                className="text-muted-foreground"
              />
            )}

            {segment.isActive ? (
              <span
                className="text-sm font-medium text-foreground font-caption"
                aria-current="page"
              >
                {segment.label}
              </span>
            ) : (
              <Link
                href={segment.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth font-caption"
              >
                {segment.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden flex items-center gap-2 w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth font-caption"
          aria-expanded={isExpanded}
          aria-label="Expandir navegación"
          type="button"
        >
          <Icon
            name="HomeIcon"
            size={20}
            className="text-muted-foreground"
          />
          {breadcrumbs.length > 1 && (
            <Icon
              name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-muted-foreground"
            />
          )}
        </button>

        <span className="text-sm font-medium text-foreground font-caption flex-1 truncate">
          {breadcrumbs[breadcrumbs.length - 1].label}
        </span>

        {isExpanded && breadcrumbs.length > 1 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card shadow-elevation-2 rounded-md border border-border z-50 overflow-hidden">
            {breadcrumbs.slice(0, -1).map((segment) => (
              <Link
                key={segment.href}
                href={segment.href}
                onClick={() => setIsExpanded(false)}
                className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-smooth font-caption border-b border-border last:border-b-0"
              >
                {segment.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default BreadcrumbNavigation;