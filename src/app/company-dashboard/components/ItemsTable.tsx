'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import StatusDropdown from './StatusDropdown';

interface ComplianceItem {
  id: number; // id del EvaluacionDetalle
  evaluacionId?: number;
  requisitoId?: number; // IMPORTANTE: se usará en el modal para cargar referencias legales
  name: string;
  description: string;
  estadoId: number;
  status: string;
  responsible: string;
  plannedDate: string;
  periodicity: string;
  lastUpdate: string;

  // ==========================================================
  // CAMPOS DEL DETALLE DE EVALUACIÓN
  // Estos campos vienen desde EvaluacionDetalle y pueden variar
  // por empresa/requisito. Se agregan como opcionales para soportar
  // tanto el formato actual del dashboard como el formato real de la API.
  // ==========================================================
  responsable?: string | null;
  Responsable?: string | null;
  fechaPlanificada?: string | null;
  FechaPlanificada?: string | null;
  idPeriocidad?: number | null;
  IdPeriocidad?: number | null;
  periocidad?: string | null;
  Periocidad?: string | null;
  ultimaActualizacion?: string | null;
  UltimaActualizacion?: string | null;
}

interface ItemsTableProps {
  items: ComplianceItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemClick: (item: ComplianceItem) => void;

  // Catálogo real de estados
  statusOptions: { id: number; label: string }[];

  // Cambio real de estado
  onStatusChange: (detalleId: number, estadoId: number) => void;

  // Si el usuario no puede editar, solo verá el texto del estado
  canEditStatus?: boolean;
}

function formatDisplayDate(value?: string | null) {
  if (!value || value === '—' || value === 'No definido') return 'No definido';

  const raw = String(value).trim();

  // Si ya viene en formato dd/mm/yyyy, lo mostramos tal cual.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  const d = new Date(raw);

  if (Number.isNaN(d.getTime())) {
    return raw;
  }

  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizeText(value?: string | null) {
  const text = String(value || '').trim();
  return text || 'No definido';
}

export default function ItemsTable({
  items,
  currentPage,
  totalPages,
  onPageChange,
  onItemClick,
  onStatusChange,
  statusOptions,
  canEditStatus = false,
}: ItemsTableProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ComplianceItem;
    direction: 'asc' | 'desc';
  } | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (key: keyof ComplianceItem) => {
    let direction: 'asc' | 'desc' = 'asc';

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    setSortConfig({ key, direction });
  };

  // ==========================================================
  // CAMPOS DEL DETALLE DE EVALUACIÓN
  // Estos helpers leen primero los nuevos campos guardados en
  // EvaluacionDetalle. Si todavía el dashboard manda el formato anterior,
  // se usan los campos legacy como fallback.
  // ==========================================================
  const getResponsibleText = (item: ComplianceItem) => {
    return normalizeText(
      item.responsable ?? item.Responsable ?? item.responsible
    );
  };

  const getPlannedDateText = (item: ComplianceItem) => {
    return formatDisplayDate(
      item.fechaPlanificada ?? item.FechaPlanificada ?? item.plannedDate
    );
  };

  const getPeriodicityText = (item: ComplianceItem) => {
    const periodicityName =
      item.periocidad ?? item.Periocidad ?? item.periodicity ?? '';

    const normalizedPeriodicity = String(periodicityName || '').trim();
    const lowerPeriodicity = normalizedPeriodicity.toLowerCase();

    // Si el backend todavía manda un texto genérico como "Periodicidad #1",
    // no lo mostramos como dato real. El dato correcto debe ser el nombre
    // de la tabla Periocidad; si no viene, mostramos "No definido".
    if (
      lowerPeriodicity === 'periodicidad' ||
      lowerPeriodicity.startsWith('periodicidad #')
    ) {
      return 'No definido';
    }

    return normalizeText(normalizedPeriodicity);
  };

  const getSortableValue = (item: ComplianceItem, key: keyof ComplianceItem) => {
    if (key === 'responsible') return getResponsibleText(item);
    if (key === 'plannedDate') return getPlannedDateText(item);
    if (key === 'periodicity') return getPeriodicityText(item);

    return item[key] as any;
  };

  const sortedItems = [...items].sort((a, b) => {
    // Orden base ascendente por id del EvaluacionDetalle.
    // Esto mantiene la tabla de 1 a infinito cuando no hay orden manual.
    if (!sortConfig) return Number(a.id) - Number(b.id);

    const aValue = getSortableValue(a, sortConfig.key);
    const bValue = getSortableValue(b, sortConfig.key);

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Si no puede editar, mostramos etiqueta. Si puede, dropdown.
  const getStatusLabel = (item: ComplianceItem) => {
    return (
      statusOptions.find((option) => option.id === item.estadoId)?.label ||
      item.status ||
      'Desconocido'
    );
  };

  const renderStatusCell = (item: ComplianceItem) => {
    if (!canEditStatus) {
      return (
        <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs text-foreground bg-muted/30">
          {getStatusLabel(item)}
        </span>
      );
    }

    return (
      <StatusDropdown
        currentEstadoId={item.estadoId}
        options={statusOptions}
        onChange={(estadoId: number) => onStatusChange(item.id, estadoId)}
      />
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elevation-1">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-smooth"
                >
                  Nombre del Requisito
                  <Icon
                    name={
                      sortConfig?.key === 'name' &&
                      sortConfig.direction === 'desc'
                        ? 'ChevronDownIcon'
                        : 'ChevronUpIcon'
                    }
                    size={16}
                  />
                </button>
              </th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-smooth"
                >
                  Estado
                  <Icon
                    name={
                      sortConfig?.key === 'status' &&
                      sortConfig.direction === 'desc'
                        ? 'ChevronDownIcon'
                        : 'ChevronUpIcon'
                    }
                    size={16}
                  />
                </button>
              </th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('responsible')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-smooth"
                >
                  Responsable
                  <Icon
                    name={
                      sortConfig?.key === 'responsible' &&
                      sortConfig.direction === 'desc'
                        ? 'ChevronDownIcon'
                        : 'ChevronUpIcon'
                    }
                    size={16}
                  />
                </button>
              </th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('plannedDate')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-smooth"
                >
                  Fecha Planificada
                  <Icon
                    name={
                      sortConfig?.key === 'plannedDate' &&
                      sortConfig.direction === 'desc'
                        ? 'ChevronDownIcon'
                        : 'ChevronUpIcon'
                    }
                    size={16}
                  />
                </button>
              </th>

              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('periodicity')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-smooth"
                >
                  Periodicidad
                  <Icon
                    name={
                      sortConfig?.key === 'periodicity' &&
                      sortConfig.direction === 'desc'
                        ? 'ChevronDownIcon'
                        : 'ChevronUpIcon'
                    }
                    size={16}
                  />
                </button>
              </th>

              <th className="px-6 py-4 text-right">
                <span className="text-sm font-semibold text-foreground">
                  Acciones
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {sortedItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-muted/50 transition-smooth cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="whitespace-pre-line">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-caption mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4">{renderStatusCell(item)}</td>

                <td className="px-6 py-4">
                  <p className="text-sm text-foreground">
                    {getResponsibleText(item)}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm text-foreground">
                    {getPlannedDateText(item)}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm text-foreground">
                    {getPeriodicityText(item)}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                      title="Ver detalles"
                    >
                      <Icon name="EyeIcon" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-border">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="p-4 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onItemClick(item)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-semibold text-foreground mb-1 whitespace-pre-line">
                  {item.name}
                </h4>
                <p className="text-xs text-muted-foreground font-caption line-clamp-2">
                  {item.description}
                </p>
              </div>

              {renderStatusCell(item)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Icon
                  name="UserIcon"
                  size={16}
                  className="text-muted-foreground"
                />
                <span className="text-foreground">
                  {getResponsibleText(item)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Icon
                  name="CalendarIcon"
                  size={16}
                  className="text-muted-foreground"
                />
                <span className="text-foreground">
                  {getPlannedDateText(item)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Icon
                  name="ClockIcon"
                  size={16}
                  className="text-muted-foreground"
                />
                <span className="text-foreground">
                  {getPeriodicityText(item)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-smooth"
              >
                <Icon name="EyeIcon" size={18} />
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-caption">
              Página {currentPage} de {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-foreground border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="ChevronLeftIcon" size={20} />
              </button>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-foreground border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="ChevronRightIcon" size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
