'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemData: NewItemData) => void;
}

interface NewItemData {
  name: string;
  description: string;
  status: string;
  responsible: string;
  plannedDate: string;
  periodicity: string;
  legalReference: string;
}

export default function NewItemModal({ isOpen, onClose, onSubmit }: NewItemModalProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<NewItemData>({
    name: '',
    description: '',
    status: 'No ha sucedido',
    responsible: '',
    plannedDate: '',
    periodicity: 'Mensual',
    legalReference: '',
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !isHydrated) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      description: '',
      status: 'No ha sucedido',
      responsible: '',
      plannedDate: '',
      periodicity: 'Mensual',
      legalReference: '',
    });
  };

  const handleChange = (field: keyof NewItemData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Nuevo Elemento de Cumplimiento
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
          >
            <Icon name="XMarkIcon" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nombre del Requisito <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                placeholder="Ingrese el nombre del requisito"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descripción <span className="text-error">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                placeholder="Describa el requisito de cumplimiento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Estado <span className="text-error">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                >
                  <option value="Cumplido">Cumplido</option>
                  <option value="En trámite">En trámite</option>
                  <option value="Incumplido">Incumplido</option>
                  <option value="No aplica">No aplica</option>
                  <option value="No ha sucedido">No ha sucedido</option>
                  <option value="Terceros-Incumplido">Terceros-Incumplido</option>
                  <option value="Terceros-Cumplido">Terceros-Cumplido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Responsable <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.responsible}
                  onChange={(e) => handleChange('responsible', e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Fecha Planificada <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.plannedDate}
                  onChange={(e) => handleChange('plannedDate', e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Periodicidad <span className="text-error">*</span>
                </label>
                <select
                  required
                  value={formData.periodicity}
                  onChange={(e) => handleChange('periodicity', e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                  <option value="Bianual">Bianual</option>
                  <option value="Única vez">Única vez</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Referencia Legal
              </label>
              <textarea
                value={formData.legalReference}
                onChange={(e) => handleChange('legalReference', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                placeholder="Ingrese la referencia legal (ley, artículo, código)"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
            >
              Crear Elemento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}