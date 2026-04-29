'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type React from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_CSI_LEGAL_API_URL || 'http://localhost:4000';

interface NewEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;

  // id del EvaluacionDetalle al que se le subirá la evidencia
  detalleId: number | null;

  // callback para que el padre recargue la lista luego de guardar
  onSaved: () => Promise<void> | void;
}

interface NewEvidenceData {
  name: string;
  description: string;
  date: string;
  files: File[];
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

export default function NewEvidenceModal({
  isOpen,
  onClose,
  detalleId,
  onSaved,
}: NewEvidenceModalProps) {
  const [formData, setFormData] = useState<NewEvidenceData>({
    name: '',
    description: '',
    date: '',
    files: [],
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      date: '',
      files: [],
    });
    setUploadedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      const updatedFiles = [...uploadedFiles, ...newFiles];

      setUploadedFiles(updatedFiles);
      setFormData((prev) => ({
        ...prev,
        files: updatedFiles,
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);

    setUploadedFiles(updatedFiles);
    setFormData((prev) => ({
      ...prev,
      files: updatedFiles,
    }));
  };

  // ==========================================================
  // ENVÍO REAL A LA API
  // Aquí construimos un FormData porque el endpoint recibe:
  // - nombre
  // - descripcion
  // - fechaRegistro
  // - documentos (uno o varios archivos)
  // ==========================================================
  const handleSubmit = async () => {
    if (!detalleId) {
      alert('No se encontró el detalle de evaluación');
      return;
    }

    if (!formData.name.trim() || !formData.date) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Debe seleccionar al menos un archivo');
      return;
    }

    const token = getToken();
    const multipart = new FormData();

    multipart.append('nombre', formData.name.trim());
    multipart.append('descripcion', formData.description.trim());
    multipart.append('fechaRegistro', formData.date);

    uploadedFiles.forEach((file) => {
      multipart.append('documentos', file);
    });

    setSaving(true);

    try {
      const res = await fetch(
        `${API_URL}/api/evaluaciones/detalle/${detalleId}/evidencias`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: multipart,
        }
      );

      if (res.status === 401) {
        localStorage.removeItem('CSI_Legal_token');
        localStorage.removeItem('CSI_Legal_user');
        alert('Sesión expirada. Inicia sesión nuevamente.');
        window.location.href = '/login';
        return;
      }

      const text = await res.text();
      let json: any = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json?.message || 'No se pudo guardar la evidencia');
      }

      resetForm();
      await onSaved();
      onClose();
    } catch (error: any) {
      alert(error?.message || 'Error guardando evidencia');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Nueva Evidencia
          </h2>

          <button
            onClick={handleCancel}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
          >
            <Icon name="XMarkIcon" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nombre de la Evidencia <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: Licencia Ambiental"
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fecha <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
            />
          </div>

          {/* Carga de archivos */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subir Archivos
            </label>

            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="evidence-file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
              />
              <label
                htmlFor="evidence-file-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-input rounded-md bg-background text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-smooth"
              >
                <Icon name="ArrowUpTrayIcon" size={24} />
                <span className="text-sm font-medium">
                  Seleccionar archivos
                </span>
              </label>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Formatos permitidos: PDF, DOC, DOCX, JPG, PNG (Máx. 10MB por archivo)
            </p>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Archivos seleccionados:
                </p>

                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        name="DocumentTextIcon"
                        size={20}
                        className="text-primary"
                      />
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 text-error hover:bg-error/10 rounded-md transition-smooth"
                    >
                      <Icon name="TrashIcon" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              placeholder="Agregue una descripción detallada de la evidencia..."
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Evidencia'}
          </button>
        </div>
      </div>
    </div>
  );
}