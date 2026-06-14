'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Requisito {
  id: number;
  Titulo: string;
  DescripcionRequisito: string;
  IdPais: number;
  IdSubCategoria: number;
  IdPeriodicidad: number;
  ResponsableEjecucion: number;
}

interface SubCategoriaOption {
  id: number;
  label: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;

  /** Filtra requisitos por país */
  countryId?: number;

  /** IDs seleccionados al abrir */
  initialSelectedIds?: number[];

  /** Confirmación de selección */
  onConfirm: (selectedIds: number[]) => void;

  /** Opcional: título */
  title?: string;
}

export default function RequisitosPickerModal({
  isOpen,
  onClose,
  countryId,
  initialSelectedIds = [],
  onConfirm,
  title = 'Seleccionar Requisitos',
}: Props) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Requisito[]>([]);
  const [subCategorias, setSubCategorias] = useState<SubCategoriaOption[]>([]);
  const [selectedSubCategoria, setSelectedSubCategoria] = useState('all');
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelectedIds));

  // Sincroniza selección al abrir
  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(initialSelectedIds));
    setQ('');
    setSelectedSubCategoria('all');
    setErr(null);
  }, [isOpen, initialSelectedIds]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    const loadSubCategorias = async () => {
      try {
        const token = localStorage.getItem('CSI_Legal_token');

        const res = await fetch(`${API_URL}/api/subcategorias/options`, {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          throw new Error(json?.message || 'No se pudieron cargar las categorías');
        }

        const options = (json?.SubCategorias || []).map((s: any) => ({
          id: Number(s.IdSubCategoria ?? s.id ?? s.IdSubcategoria),
          label: String(s.Label ?? s.label ?? s.Categoria ?? s.Nombre ?? ''),
        })) as SubCategoriaOption[];

        setSubCategorias(
          options.filter((option) => option.id > 0 && option.label)
        );
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.warn(
            '[RequisitosPickerModal] loadSubCategorias error:',
            e?.message || e
          );
          setSubCategorias([]);
        }
      }
    };

    loadSubCategorias();

    return () => controller.abort();
  }, [isOpen]);

  // Fetch requisitos con debounce
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);

      try {
        const token = localStorage.getItem('CSI_Legal_token');

        const params = new URLSearchParams();
        if (countryId && Number.isInteger(countryId) && countryId > 0) {
          params.set('countryId', String(countryId));
        }
        if (selectedSubCategoria !== 'all') {
          params.set('subCategoriaId', selectedSubCategoria);
        }
        if (q.trim().length > 0) params.set('q', q.trim());

        const res = await fetch(`${API_URL}/api/requisitos?${params.toString()}`, {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(json?.message || 'No se pudieron cargar los requisitos');

        const data: Requisito[] = Array.isArray(json?.Requisitos) ? json.Requisitos : [];
        setItems(data);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setErr(e?.message || 'Error cargando requisitos');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [isOpen, q, countryId, selectedSubCategoria]);

  const selectedCount = selected.size;

  const visibleItems = useMemo(() => {
    if (selectedSubCategoria === 'all') return items;

    const subCategoriaId = Number(selectedSubCategoria);
    return items.filter((it) => Number(it.IdSubCategoria) === subCategoriaId);
  }, [items, selectedSubCategoria]);

  const allVisibleSelected = useMemo(() => {
    if (visibleItems.length === 0) return false;
    return visibleItems.every((it) => selected.has(it.id));
  }, [visibleItems, selected]);

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        // deselecciona visibles
        visibleItems.forEach((it) => next.delete(it.id));
      } else {
        // selecciona visibles
        visibleItems.forEach((it) => next.add(it.id));
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()));
    onClose();
  };

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar modal"
      />

      {/* modal */}
      <div className="relative w-full max-w-3xl mx-4 bg-card border border-border rounded-lg shadow-elevation-2 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground font-caption">
              Seleccionados: <b>{selectedCount}</b>
            </p>
          </div>

          <button
            className="p-2 rounded-md hover:bg-muted transition-smooth"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          {/* search */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_auto] gap-3 items-center mb-3">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="MagnifyingGlassIcon" size={18} className="text-muted-foreground" />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Buscar por nombre o descripción..."
              />
            </div>

            <select
              value={selectedSubCategoria}
              onChange={(e) => setSelectedSubCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todas las categorías</option>
              {subCategorias.map((subCategoria) => (
                <option key={subCategoria.id} value={String(subCategoria.id)}>
                  {subCategoria.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAllVisible}
                disabled={visibleItems.length === 0}
                className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth disabled:opacity-50"
              >
                {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
              </button>
            </div>
          </div>

          {err && (
            <div className="mb-3 bg-error/10 border border-error rounded-md p-3 text-sm text-error">
              {err}
            </div>
          )}

          {/* list */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="max-h-[380px] overflow-auto">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground">Cargando requisitos...</div>
              ) : visibleItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No hay requisitos para mostrar.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleItems.map((r) => {
                    const checked = selected.has(r.id);
                    const subCategoriaLabel =
                      subCategorias.find((s) => s.id === Number(r.IdSubCategoria))
                        ?.label || `IdSubCategoria: ${r.IdSubCategoria}`;
                    return (
                      <li key={r.id} className="p-4 hover:bg-muted/40 transition-smooth">
                        <label className="flex gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(r.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  #{r.id} — {r.Titulo}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {r.DescripcionRequisito}
                                </p>
                              </div>

                              {checked && (
                                <div className="flex items-center gap-1 text-success text-xs">
                                  <Icon name="CheckIcon" size={16} className="text-success" />
                                  Seleccionado
                                </div>
                              )}
                            </div>

                            <div className="mt-2 text-[11px] text-muted-foreground">
                              <span className="mr-3">IdPais: {r.IdPais}</span>
                              <span className="mr-3">Categoría: {subCategoriaLabel}</span>
                              <span className="mr-3">IdPeriodicidad: {r.IdPeriodicidad}</span>
                              <span>ResponsableEjecucion: {r.ResponsableEjecucion}</span>
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Tip: escribe parte del nombre (ej: “energía”) para filtrar.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-input hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth"
            >
              Confirmar ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
