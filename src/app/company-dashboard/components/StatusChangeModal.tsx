'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type ComplianceItem = {
  id: number;
  name: string;
  status: string;
};

interface StatusChangeModalProps {
  isOpen: boolean;
  item: ComplianceItem;                // ✅ ahora sí existe
  onClose: () => void;
  onSave: (newStatus: string) => void; // lo que ya usas
}

const STATUS_OPTIONS = [
  'Cumplido',
  'En trámite',
  'Incumplido',
  'No aplica',
  'No ha sucedido',
  'Terceros - Incumplido',
  'Terceros - Cumplido',
];

export default function StatusChangeModal({ isOpen, item, onClose, onSave }: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(item.status);

  useEffect(() => {
    if (isOpen) setSelectedStatus(item.status);
  }, [isOpen, item.status]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Cerrar modal" />

      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-lg shadow-elevation-2 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Cambiar estado</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">
              {item.name}
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
          <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-input hover:bg-muted transition-smooth"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(selectedStatus)}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}