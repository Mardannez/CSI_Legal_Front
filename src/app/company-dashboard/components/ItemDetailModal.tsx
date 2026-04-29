'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from './StatusBadge';
import NewEvidenceModal from './NewEvidenceModal';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ComplianceItem {
  id: number; // id EvaluacionDetalle
  evaluacionId?: number;
  requisitoId?: number;
  name: string;
  description: string;
  status: string;
  responsible: string;
  plannedDate: string;
  periodicity: string;
  lastUpdate: string;
}

interface ItemDetailModalProps {
  isOpen: boolean;
  item: ComplianceItem | null;
  onClose: () => void;
  onSave: (updatedItem: ComplianceItem) => void;
}

type TabType =
  | 'info'
  | 'legal'
  | 'evidence'
  | 'calendar'
  | 'responsibles'
  | 'audit';

interface LegalReferenceItem {
  id: number;
  IdRequisito: number;
  Ambito: string;
  Articulo: string;
  Ley: string;
  Modificaciones: string | null;
  FechaRegistro?: string | null;
}

interface LawItem {
  id: number;
  IdReferenciaLegal: number;
  NombreLey: string;
}

interface Evidence {
  id: number;
  IdEvaluacionDetalle?: number;
  name: string;
  type: string;
  uploadDate: string;
  description?: string;
  originalFileName?: string | null;
  mimeType?: string | null;
}

interface CalendarEvent {
  id: number;
  IdEvaluacionDetalle: number;
  FechaRegistro: string;
  IdEvidencia: number;
  Comentario: string | null;
  Evidencia?: {
    id: number;
    Nombre: string;
    Descripcion?: string | null;
    FechaRegistro?: string | null;
    NombreArchivoOriginal?: string | null;
    TipoMime?: string | null;
  } | null;
}

interface AvailableResponsible {
  id: number;
  IdEmpresa: number;
  Nombre: string;
  Correo: string | null;
  FechaRegistro: string;
}

interface AssignedResponsible {
  id: number; // id de RequisitoResponsables
  IdEvaluacionDetalle: number;
  IdResponsable: number;
  FechaRegistro: string;
  Responsable: AvailableResponsible | null;
}

interface AuditEntry {
  id: number;
  date: string;
  user: string;
  action: string;
  details: string;
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

function formatApiDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function guessTypeFromName(name: string) {
  const lower = name.toLowerCase();

  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.doc')) return 'DOC';
  if (lower.endsWith('.docx')) return 'DOCX';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  if (lower.endsWith('.png')) return 'PNG';

  return 'Archivo';
}

function getFriendlyFileType(mimeType?: string | null, fileName?: string | null) {
  switch ((mimeType || '').toLowerCase()) {
    case 'application/pdf':
      return 'PDF';
    case 'application/msword':
      return 'DOC';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    case 'image/jpeg':
      return 'JPG';
    case 'image/png':
      return 'PNG';
    default:
      return guessTypeFromName(fileName || '');
  }
}

function getExtensionFromMimeType(mimeType?: string | null) {
  switch ((mimeType || '').toLowerCase()) {
    case 'application/pdf':
      return 'pdf';
    case 'application/msword':
      return 'doc';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'bin';
  }
}

function getFileNameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/["']/g, '').trim());
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }

  return null;
}

export default function ItemDetailModal({
  isOpen,
  item,
  onClose,
  onSave,
}: ItemDetailModalProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItem, setEditedItem] = useState<ComplianceItem | null>(null);

  // ==========================================================
  // REFERENCIA LEGAL
  // ==========================================================
  const [legalReferences, setLegalReferences] = useState<LegalReferenceItem[]>(
    []
  );
  const [loadingLegalReferences, setLoadingLegalReferences] = useState(false);
  const [legalReferencesError, setLegalReferencesError] = useState<string | null>(
    null
  );
  const [selectedLegalItem, setSelectedLegalItem] =
    useState<LegalReferenceItem | null>(null);

  const [laws, setLaws] = useState<LawItem[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(false);
  const [lawsError, setLawsError] = useState<string | null>(null);

  // ==========================================================
  // EVIDENCIAS
  // ==========================================================
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loadingEvidences, setLoadingEvidences] = useState(false);
  const [evidencesError, setEvidencesError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(
    null
  );
  const [showNewEvidenceModal, setShowNewEvidenceModal] = useState(false);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<number | null>(
    null
  );

  // ==========================================================
  // CALENDARIO / EVENTOS
  // ==========================================================
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  const [newEvent, setNewEvent] = useState({
    date: '',
    idEvidencia: '',
    comment: '',
  });

  // ==========================================================
  // RESPONSABLES
  // ==========================================================
  const [assignedResponsibles, setAssignedResponsibles] = useState<
    AssignedResponsible[]
  >([]);
  const [availableResponsibles, setAvailableResponsibles] = useState<
    AvailableResponsible[]
  >([]);
  const [loadingAssignedResponsibles, setLoadingAssignedResponsibles] =
    useState(false);
  const [loadingAvailableResponsibles, setLoadingAvailableResponsibles] =
    useState(false);
  const [responsiblesError, setResponsiblesError] = useState<string | null>(null);

  const [showResponsibleModal, setShowResponsibleModal] = useState(false);
  const [assigningResponsible, setAssigningResponsible] = useState(false);
  const [creatingResponsible, setCreatingResponsible] = useState(false);
  const [deletingResponsibleRelationId, setDeletingResponsibleRelationId] =
    useState<number | null>(null);

  const [selectedAvailableResponsibleId, setSelectedAvailableResponsibleId] =
    useState('');

  const [newResponsibleForm, setNewResponsibleForm] = useState({
    nombre: '',
    correo: '',
  });

  // ==========================================================
  // AUDITORÍA MOCK
  // ==========================================================
  const [auditHistory] = useState<AuditEntry[]>([
    {
      id: 1,
      date: '10/02/2026 14:30',
      user: 'María González',
      action: 'Actualización de estado',
      details: 'Estado cambiado de "En trámite" a "Cumplido"',
    },
  ]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setEditedItem(item);
      setIsEditMode(false);
      setActiveTab('info');

      setSelectedLegalItem(null);
      setSelectedEvidence(null);

      setLegalReferences([]);
      setLaws([]);
      setLegalReferencesError(null);
      setLawsError(null);

      setEvidences([]);
      setEvidencesError(null);
      setDeletingEvidenceId(null);

      setEvents([]);
      setEventsError(null);
      setShowAddEventForm(false);
      setSavingEvent(false);
      setDeletingEventId(null);
      setNewEvent({
        date: '',
        idEvidencia: '',
        comment: '',
      });

      setAssignedResponsibles([]);
      setAvailableResponsibles([]);
      setResponsiblesError(null);
      setShowResponsibleModal(false);
      setAssigningResponsible(false);
      setCreatingResponsible(false);
      setDeletingResponsibleRelationId(null);
      setSelectedAvailableResponsibleId('');
      setNewResponsibleForm({
        nombre: '',
        correo: '',
      });
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, item]);

  const fetchJson = async (url: string, init?: RequestInit) => {
    const token = getToken();

    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      localStorage.removeItem('CSI_Legal_token');
      localStorage.removeItem('CSI_Legal_user');
      throw new Error('Sesión expirada');
    }

    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      throw new Error(json?.message || `Error HTTP ${res.status}`);
    }

    return json;
  };

  // ==========================================================
  // REFERENCIA LEGAL
  // ==========================================================
  const loadLegalReferences = async (requisitoId: number) => {
    setLoadingLegalReferences(true);
    setLegalReferencesError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/requisitos/${requisitoId}/referencias-legales`
      );

      const refs = (json?.ReferenciasLegales || []) as LegalReferenceItem[];
      setLegalReferences(refs);

      if (refs.length > 0) {
        setSelectedLegalItem(refs[0]);
      } else {
        setSelectedLegalItem(null);
        setLaws([]);
      }
    } catch (e: any) {
      setLegalReferencesError(
        e?.message || 'Error cargando referencias legales'
      );
      setLegalReferences([]);
      setSelectedLegalItem(null);
      setLaws([]);
    } finally {
      setLoadingLegalReferences(false);
    }
  };

  const loadLaws = async (idReferenciaLegal: number) => {
    setLoadingLaws(true);
    setLawsError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/referencias-legales/${idReferenciaLegal}/leyes`
      );

      setLaws((json?.Leyes || []) as LawItem[]);
    } catch (e: any) {
      setLawsError(e?.message || 'Error cargando leyes');
      setLaws([]);
    } finally {
      setLoadingLaws(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !item) return;
    if (activeTab !== 'legal') return;
    if (!item.requisitoId) return;

    loadLegalReferences(item.requisitoId);
  }, [activeTab, isOpen, item]);

  useEffect(() => {
    if (!selectedLegalItem?.id) {
      setLaws([]);
      return;
    }

    loadLaws(selectedLegalItem.id);
  }, [selectedLegalItem]);

  const handleDownloadLaw = async (law: LawItem) => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/requisitos-mantenimiento/leyes/${law.id}/download`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem('CSI_Legal_token');
        localStorage.removeItem('CSI_Legal_user');
        throw new Error('Sesión expirada');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error descargando ley');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = res.headers.get('content-disposition');
      const backendFileName =
        getFileNameFromContentDisposition(contentDisposition) ||
        `${law.NombreLey}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = backendFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Error descargando ley');
    }
  };

  // ==========================================================
  // EVIDENCIAS
  // ==========================================================
  const loadEvidences = async (detalleId: number) => {
    setLoadingEvidences(true);
    setEvidencesError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${detalleId}/evidencias`
      );

      const apiRows = Array.isArray(json?.Evidencias) ? json.Evidencias : [];

      const mapped: Evidence[] = apiRows.map((row: any) => ({
        id: Number(row.id),
        IdEvaluacionDetalle: Number(row.IdEvaluacionDetalle),
        name: String(row.Nombre || ''),
        type: getFriendlyFileType(
          row.TipoMime || null,
          row.NombreArchivoOriginal || row.Nombre || ''
        ),
        uploadDate: formatApiDate(row.FechaRegistro),
        description: row.Descripcion || '',
        originalFileName: row.NombreArchivoOriginal || null,
        mimeType: row.TipoMime || null,
      }));

      setEvidences(mapped);

      if (mapped.length > 0) {
        setSelectedEvidence(mapped[0]);
      } else {
        setSelectedEvidence(null);
      }
    } catch (e: any) {
      setEvidencesError(e?.message || 'Error cargando evidencias');
      setEvidences([]);
      setSelectedEvidence(null);
    } finally {
      setLoadingEvidences(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !item) return;
    if (activeTab !== 'evidence') return;
    if (!item.id) return;

    loadEvidences(item.id);
  }, [activeTab, isOpen, item]);

  const handleDownloadEvidence = async (evidence: Evidence) => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/evaluaciones/evidencias/${evidence.id}/download`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem('CSI_Legal_token');
        localStorage.removeItem('CSI_Legal_user');
        throw new Error('Sesión expirada');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error descargando evidencia');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = res.headers.get('content-disposition');
      const backendFileName = getFileNameFromContentDisposition(contentDisposition);

      const fallbackExtension = getExtensionFromMimeType(
        evidence.mimeType || null
      );

      const fallbackName =
        evidence.originalFileName ||
        `${evidence.name}.${fallbackExtension}`;

      const finalFileName = backendFileName || fallbackName;

      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Error descargando evidencia');
    }
  };

  const handleDeleteEvidence = async (evidence: Evidence) => {
    if (!confirm(`¿Desea eliminar la evidencia "${evidence.name}"?`)) {
      return;
    }

    setDeletingEvidenceId(evidence.id);

    try {
      await fetchJson(
        `${API_URL}/api/evaluaciones/evidencias/${evidence.id}`,
        {
          method: 'DELETE',
        }
      );

      if (item?.id) {
        await loadEvidences(item.id);
      }
    } catch (e: any) {
      alert(e?.message || 'Error eliminando evidencia');
    } finally {
      setDeletingEvidenceId(null);
    }
  };

  // ==========================================================
  // CALENDARIO / EVENTOS
  // ==========================================================
  const loadEvents = async (detalleId: number) => {
    setLoadingEvents(true);
    setEventsError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${detalleId}/eventos`
      );

      const rows = Array.isArray(json?.Eventos) ? json.Eventos : [];
      setEvents(rows as CalendarEvent[]);
    } catch (e: any) {
      setEventsError(e?.message || 'Error cargando eventos');
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !item) return;
    if (activeTab !== 'calendar') return;
    if (!item.id) return;

    loadEvents(item.id);
    loadEvidences(item.id);
  }, [activeTab, isOpen, item]);

  const handleAddEventClick = () => {
    setShowAddEventForm(true);
    setNewEvent({
      date: '',
      idEvidencia: '',
      comment: '',
    });
  };

  const handleCancelEvent = () => {
    setShowAddEventForm(false);
    setNewEvent({
      date: '',
      idEvidencia: '',
      comment: '',
    });
  };

  const handleSaveEvent = async () => {
    if (!item?.id) {
      alert('No se encontró el detalle de evaluación');
      return;
    }

    if (!newEvent.date) {
      alert('Seleccione una fecha');
      return;
    }

    if (!newEvent.idEvidencia) {
      alert('Seleccione una evidencia');
      return;
    }

    setSavingEvent(true);

    try {
      await fetchJson(`${API_URL}/api/evaluaciones/detalle/${item.id}/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fechaRegistro: newEvent.date,
          idEvidencia: Number(newEvent.idEvidencia),
          comentario: newEvent.comment.trim(),
        }),
      });

      await loadEvents(item.id);

      setShowAddEventForm(false);
      setNewEvent({
        date: '',
        idEvidencia: '',
        comment: '',
      });
    } catch (e: any) {
      alert(e?.message || 'Error guardando evento');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('¿Desea eliminar este evento?')) return;

    setDeletingEventId(eventId);

    try {
      await fetchJson(`${API_URL}/api/evaluaciones/eventos/${eventId}`, {
        method: 'DELETE',
      });

      if (item?.id) {
        await loadEvents(item.id);
      }
    } catch (e: any) {
      alert(e?.message || 'Error eliminando evento');
    } finally {
      setDeletingEventId(null);
    }
  };

  // ==========================================================
  // RESPONSABLES
  // ==========================================================
  const loadAssignedResponsibles = async (detalleId: number) => {
    setLoadingAssignedResponsibles(true);
    setResponsiblesError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${detalleId}/responsables`
      );

      const rows = Array.isArray(json?.ResponsablesAsignados)
        ? json.ResponsablesAsignados
        : [];

      setAssignedResponsibles(rows as AssignedResponsible[]);
    } catch (e: any) {
      setResponsiblesError(e?.message || 'Error cargando responsables asignados');
      setAssignedResponsibles([]);
    } finally {
      setLoadingAssignedResponsibles(false);
    }
  };

  const loadAvailableResponsibles = async (detalleId: number) => {
    setLoadingAvailableResponsibles(true);

    try {
      const json = await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${detalleId}/responsables/disponibles`
      );

      const rows = Array.isArray(json?.Responsables) ? json.Responsables : [];
      setAvailableResponsibles(rows as AvailableResponsible[]);
    } catch (e: any) {
      setResponsiblesError(
        e?.message || 'Error cargando responsables disponibles'
      );
      setAvailableResponsibles([]);
    } finally {
      setLoadingAvailableResponsibles(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !item) return;
    if (activeTab !== 'responsibles') return;
    if (!item.id) return;

    loadAssignedResponsibles(item.id);
    loadAvailableResponsibles(item.id);
  }, [activeTab, isOpen, item]);

  const handleOpenResponsibleModal = async () => {
    if (!item?.id) return;

    setShowResponsibleModal(true);
    setSelectedAvailableResponsibleId('');
    setNewResponsibleForm({
      nombre: '',
      correo: '',
    });

    await loadAvailableResponsibles(item.id);
  };

  const handleCloseResponsibleModal = () => {
    setShowResponsibleModal(false);
    setSelectedAvailableResponsibleId('');
    setNewResponsibleForm({
      nombre: '',
      correo: '',
    });
  };

  const handleAssignExistingResponsible = async () => {
    if (!item?.id) {
      alert('No se encontró el detalle de evaluación');
      return;
    }

    if (!selectedAvailableResponsibleId) {
      alert('Seleccione un responsable');
      return;
    }

    setAssigningResponsible(true);

    try {
      await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${item.id}/responsables`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idResponsable: Number(selectedAvailableResponsibleId),
          }),
        }
      );

      await loadAssignedResponsibles(item.id);
      await loadAvailableResponsibles(item.id);
      handleCloseResponsibleModal();
    } catch (e: any) {
      alert(e?.message || 'Error asignando responsable');
    } finally {
      setAssigningResponsible(false);
    }
  };

  const handleCreateAndAssignResponsible = async () => {
    if (!item?.id) {
      alert('No se encontró el detalle de evaluación');
      return;
    }

    if (!newResponsibleForm.nombre.trim()) {
      alert('Ingrese el nombre del responsable');
      return;
    }

    setCreatingResponsible(true);

    try {
      await fetchJson(
        `${API_URL}/api/evaluaciones/detalle/${item.id}/responsables/nuevo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: newResponsibleForm.nombre.trim(),
            correo: newResponsibleForm.correo.trim(),
          }),
        }
      );

      await loadAssignedResponsibles(item.id);
      await loadAvailableResponsibles(item.id);

      setNewResponsibleForm({
        nombre: '',
        correo: '',
      });

      handleCloseResponsibleModal();
    } catch (e: any) {
      alert(e?.message || 'Error creando y asignando responsable');
    } finally {
      setCreatingResponsible(false);
    }
  };

  const handleDeleteResponsibleAssignment = async (relacionId: number) => {
    if (!confirm('¿Desea quitar este responsable del requisito?')) return;

    setDeletingResponsibleRelationId(relacionId);

    try {
      await fetchJson(
        `${API_URL}/api/evaluaciones/requisito-responsables/${relacionId}`,
        {
          method: 'DELETE',
        }
      );

      if (item?.id) {
        await loadAssignedResponsibles(item.id);
        await loadAvailableResponsibles(item.id);
      }
    } catch (e: any) {
      alert(e?.message || 'Error quitando responsable');
    } finally {
      setDeletingResponsibleRelationId(null);
    }
  };

  if (!isOpen || !isHydrated || !item) return null;

  const tabs = [
    { id: 'info' as TabType, label: 'Información', icon: 'InformationCircleIcon' },
    { id: 'legal' as TabType, label: 'Referencia Legal', icon: 'ScaleIcon' },
    { id: 'evidence' as TabType, label: 'Evidencias', icon: 'DocumentTextIcon' },
    { id: 'calendar' as TabType, label: 'Calendario', icon: 'CalendarIcon' },
    { id: 'responsibles' as TabType, label: 'Responsables', icon: 'UsersIcon' },
    { id: 'audit' as TabType, label: 'Historial de Auditoría', icon: 'ClockIcon' },
  ];

  const handleSave = () => {
    if (editedItem) {
      onSave(editedItem);
      setIsEditMode(false);
    }
  };

  const handleCancel = () => {
    setEditedItem(item);
    setIsEditMode(false);
  };

  const handleChange = (field: keyof ComplianceItem, value: string) => {
    if (editedItem) {
      setEditedItem({ ...editedItem, [field]: value });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">
                {item.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">ID: {item.id}</p>
            </div>

            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-smooth flex items-center gap-2"
                >
                  <Icon name="PencilIcon" size={16} />
                  Editar
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>
          </div>

          <div className="border-b border-border bg-muted/30">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-smooth border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {isEditMode ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nombre del Requisito <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={editedItem?.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Descripción <span className="text-error">*</span>
                      </label>
                      <textarea
                        value={editedItem?.description || ''}
                        onChange={(e) =>
                          handleChange('description', e.target.value)
                        }
                        rows={4}
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Estado <span className="text-error">*</span>
                        </label>
                        <select
                          value={editedItem?.status || ''}
                          onChange={(e) => handleChange('status', e.target.value)}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                        >
                          <option value="Cumplido">Cumplido</option>
                          <option value="En trámite">En trámite</option>
                          <option value="Incumplido">Incumplido</option>
                          <option value="No aplica">No aplica</option>
                          <option value="No ha sucedido">No ha sucedido</option>
                          <option value="Terceros-Incumplido">
                            Terceros-Incumplido
                          </option>
                          <option value="Terceros-Cumplido">
                            Terceros-Cumplido
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Responsable <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          value={editedItem?.responsible || ''}
                          onChange={(e) =>
                            handleChange('responsible', e.target.value)
                          }
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
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
                          value={
                            editedItem?.plannedDate
                              .split('/')
                              .reverse()
                              .join('-') || ''
                          }
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            const formatted = date.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            });
                            handleChange('plannedDate', formatted);
                          }}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Periodicidad <span className="text-error">*</span>
                        </label>
                        <select
                          value={editedItem?.periodicity || ''}
                          onChange={(e) =>
                            handleChange('periodicity', e.target.value)
                          }
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
                        Última Actualización
                      </label>
                      <input
                        type="text"
                        value={editedItem?.lastUpdate || ''}
                        disabled
                        className="w-full px-4 py-2 border border-input rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Estado
                        </label>
                        <StatusBadge status={item.status} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Responsable
                        </label>
                        <p className="text-foreground">{item.responsible}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Fecha Planificada
                        </label>
                        <p className="text-foreground">{item.plannedDate}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Periodicidad
                        </label>
                        <p className="text-foreground">{item.periodicity}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Última Actualización
                        </label>
                        <p className="text-foreground">{item.lastUpdate}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Descripción
                      </label>
                      <p className="text-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="space-y-6">
                <div className="border border-border rounded-lg overflow-hidden">
                  {loadingLegalReferences ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 rounded bg-muted animate-pulse"
                        />
                      ))}
                    </div>
                  ) : legalReferencesError ? (
                    <div className="p-6 text-sm text-error">
                      {legalReferencesError}
                    </div>
                  ) : legalReferences.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Este requisito no tiene referencias legales registradas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Ámbito
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Artículo
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Ley
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Modificaciones
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {legalReferences.map((ref) => (
                            <tr
                              key={ref.id}
                              onClick={() => setSelectedLegalItem(ref)}
                              className={`border-b border-border cursor-pointer transition-smooth hover:bg-muted/30 ${
                                selectedLegalItem?.id === ref.id
                                  ? 'bg-primary/10'
                                  : 'bg-background'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ref.Ambito}
                              </td>
                              <td className="px-4 py-3 text-sm text-primary font-medium">
                                {ref.Articulo}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ref.Ley}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {ref.Modificaciones || 'Sin modificaciones'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-lg p-6 bg-muted/20 min-h-[300px]">
                  {!selectedLegalItem ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center">
                      <div className="mb-4">
                        <Icon
                          name="DocumentTextIcon"
                          size={48}
                          className="text-muted-foreground/40"
                        />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Selecciona una opción de la lista
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                          Contenido del Artículo
                        </h4>

                        <div className="rounded-md border border-border bg-background p-4">
                          <p className="text-foreground leading-relaxed">
                            {selectedLegalItem.Articulo} - {selectedLegalItem.Ley}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            No se configuró un campo de contenido del artículo en la
                            tabla ReferenciaLegal. Si luego agregas ese campo, aquí
                            se puede mostrar el texto legal completo.
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                          Decretos de Ley Relacionados
                        </h4>

                        {loadingLaws ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-12 rounded bg-muted animate-pulse"
                              />
                            ))}
                          </div>
                        ) : lawsError ? (
                          <div className="text-sm text-error">{lawsError}</div>
                        ) : laws.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                            Esta referencia legal no tiene leyes/PDF asociadas.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {laws.map((law) => (
                              <button
                                key={law.id}
                                type="button"
                                onClick={() => handleDownloadLaw(law)}
                                className="w-full flex items-start gap-3 p-3 bg-background border border-border rounded-md hover:bg-muted/50 transition-smooth text-left"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  <Icon
                                    name="DocumentTextIcon"
                                    size={18}
                                    className="text-primary"
                                  />
                                </div>

                                <div className="flex-1">
                                  <p className="text-sm text-foreground">
                                    {law.NombreLey}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Clic para descargar PDF
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="flex gap-6 h-[500px]">
                <div className="w-1/3 flex flex-col border-r border-border pr-6">
                  <button
                    onClick={() => setShowNewEvidenceModal(true)}
                    className="w-full px-4 py-3 mb-4 text-sm font-medium text-primary border-2 border-primary rounded-md hover:bg-primary/10 transition-smooth flex items-center justify-center gap-2"
                  >
                    <Icon name="PlusIcon" size={18} />
                    Nueva evidencia
                  </button>

                  {loadingEvidences ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 rounded-lg bg-muted animate-pulse"
                        />
                      ))}
                    </div>
                  ) : evidencesError ? (
                    <div className="text-sm text-error">{evidencesError}</div>
                  ) : evidences.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4">
                      No hay evidencias registradas para este requisito evaluado.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {evidences.map((evidence) => (
                        <div
                          key={evidence.id}
                          onClick={() => setSelectedEvidence(evidence)}
                          className={`p-3 border rounded-lg cursor-pointer transition-smooth hover:bg-muted/50 ${
                            selectedEvidence?.id === evidence.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon
                              name="PaperClipIcon"
                              size={16}
                              className="text-muted-foreground mt-1 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground line-clamp-2">
                                {evidence.name}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {evidence.uploadDate}
                              </p>
                              <p className="text-xs text-primary mt-0.5">
                                {evidence.type}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  {selectedEvidence ? (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between pb-4 border-b border-border">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {selectedEvidence.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Tipo: {selectedEvidence.type} • Subido el{' '}
                            {selectedEvidence.uploadDate}
                          </p>
                          {selectedEvidence.originalFileName ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Archivo: {selectedEvidence.originalFileName}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadEvidence(selectedEvidence)}
                            className="px-3 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-smooth flex items-center gap-2"
                          >
                            <Icon name="ArrowDownTrayIcon" size={16} />
                            Descargar
                          </button>

                          <button
                            onClick={() => handleDeleteEvidence(selectedEvidence)}
                            disabled={deletingEvidenceId === selectedEvidence.id}
                            className="px-3 py-2 text-sm font-medium text-error border border-error rounded-md hover:bg-error/10 transition-smooth flex items-center gap-2 disabled:opacity-50"
                          >
                            <Icon name="TrashIcon" size={16} />
                            {deletingEvidenceId === selectedEvidence.id
                              ? 'Eliminando...'
                              : 'Eliminar'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Descripción
                          </label>
                          <p className="text-foreground">
                            {selectedEvidence.description ||
                              'Sin descripción adicional'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Icon
                        name="DocumentTextIcon"
                        size={48}
                        className="text-muted-foreground/40 mb-4"
                      />
                      <p className="text-muted-foreground text-sm">
                        Selecciona una evidencia para ver su detalle
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Eventos de Calendario
                  </h3>

                  <button
                    onClick={handleAddEventClick}
                    className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-smooth"
                  >
                    Agregar evento
                  </button>
                </div>

                {showAddEventForm && (
                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Fecha <span className="text-error">*</span>
                        </label>
                        <input
                          type="date"
                          value={newEvent.date}
                          onChange={(e) =>
                            setNewEvent({ ...newEvent, date: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Evidencia relacionada <span className="text-error">*</span>
                        </label>
                        <select
                          value={newEvent.idEvidencia}
                          onChange={(e) =>
                            setNewEvent({
                              ...newEvent,
                              idEvidencia: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                        >
                          <option value="">Seleccione una evidencia</option>
                          {evidences.map((ev) => (
                            <option key={ev.id} value={String(ev.id)}>
                              {ev.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {evidences.length === 0 && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Debe registrar al menos una evidencia antes de crear un evento.
                      </p>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Comentario
                      </label>
                      <textarea
                        value={newEvent.comment}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, comment: e.target.value })
                        }
                        rows={3}
                        placeholder="Comentario"
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={handleCancelEvent}
                        className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-smooth"
                      >
                        Cancelar
                      </button>

                      <button
                        onClick={handleSaveEvent}
                        disabled={savingEvent || evidences.length === 0}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {savingEvent ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}

                {loadingEvents ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-24 rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : eventsError ? (
                  <div className="text-sm text-error">{eventsError}</div>
                ) : events.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay eventos registrados para este requisito evaluado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="border border-border rounded-lg p-4 bg-background"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {event.Evidencia?.Nombre || 'Evento'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatApiDate(event.FechaRegistro)}
                            </p>

                            {event.Comentario ? (
                              <p className="text-sm text-foreground mt-3">
                                {event.Comentario}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground mt-3">
                                Sin comentario
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deletingEventId === event.id}
                            className="px-3 py-2 text-sm font-medium text-error border border-error rounded-md hover:bg-error/10 transition-smooth disabled:opacity-50"
                          >
                            {deletingEventId === event.id
                              ? 'Eliminando...'
                              : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'responsibles' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Responsables del Requisito
                  </h3>

                  <button
                    onClick={handleOpenResponsibleModal}
                    className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-smooth"
                  >
                    Agregar responsable
                  </button>
                </div>

                {responsiblesError && (
                  <div className="text-sm text-error">{responsiblesError}</div>
                )}

                {loadingAssignedResponsibles ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-28 rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : assignedResponsibles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay responsables asignados a este requisito evaluado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedResponsibles.map((row) => (
                      <div
                        key={row.id}
                        className="border border-border rounded-lg p-4 bg-background"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {row.Responsable?.Nombre || 'Responsable'}
                            </h4>

                            {row.Responsable?.Correo ? (
                              <p className="text-sm text-muted-foreground mt-2">
                                {row.Responsable.Correo}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground mt-2">
                                Sin correo registrado
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Asignado el {formatApiDate(row.FechaRegistro)}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              handleDeleteResponsibleAssignment(row.id)
                            }
                            disabled={deletingResponsibleRelationId === row.id}
                            className="px-3 py-2 text-sm font-medium text-error border border-error rounded-md hover:bg-error/10 transition-smooth disabled:opacity-50"
                          >
                            {deletingResponsibleRelationId === row.id
                              ? 'Quitando...'
                              : 'Quitar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4">
                {auditHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-border rounded-lg p-4 bg-background"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {entry.action}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.user}
                        </p>
                        <p className="text-sm text-foreground mt-2">
                          {entry.details}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEditMode && (
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
              >
                Guardar Cambios
              </button>
            </div>
          )}
        </div>

        <NewEvidenceModal
          isOpen={showNewEvidenceModal}
          onClose={() => setShowNewEvidenceModal(false)}
          detalleId={item.id}
          onSaved={async () => {
            await loadEvidences(item.id);

            if (activeTab === 'calendar') {
              await loadEvidences(item.id);
            }
          }}
        />
      </div>

      {/* ======================================================
          MODAL RESPONSABLES
          Aquí el usuario puede:
          1. asignar uno existente de la empresa
          2. crear uno nuevo y asignarlo inmediatamente
         ====================================================== */}
      {showResponsibleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                Agregar Responsable
              </h2>

              <button
                onClick={handleCloseResponsibleModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Asignar responsable existente
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona un responsable ya creado para esta empresa.
                </p>

                {loadingAvailableResponsibles ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-10 rounded bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedAvailableResponsibleId}
                      onChange={(e) =>
                        setSelectedAvailableResponsibleId(e.target.value)
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                    >
                      <option value="">Seleccione un responsable</option>
                      {availableResponsibles.map((resp) => (
                        <option key={resp.id} value={String(resp.id)}>
                          {resp.Nombre}
                          {resp.Correo ? ` - ${resp.Correo}` : ''}
                        </option>
                      ))}
                    </select>

                    {availableResponsibles.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-3">
                        No hay responsables disponibles aún para esta empresa.
                      </p>
                    )}

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleAssignExistingResponsible}
                        disabled={
                          assigningResponsible ||
                          !selectedAvailableResponsibleId
                        }
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {assigningResponsible
                          ? 'Asignando...'
                          : 'Asignar responsable'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Crear nuevo responsable
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Este responsable se guardará para la empresa y se asignará de inmediato al requisito.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nombre <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={newResponsibleForm.nombre}
                      onChange={(e) =>
                        setNewResponsibleForm({
                          ...newResponsibleForm,
                          nombre: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                      placeholder="Ej: María González"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={newResponsibleForm.correo}
                      onChange={(e) =>
                        setNewResponsibleForm({
                          ...newResponsibleForm,
                          correo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                      placeholder="Ej: maria.gonzalez@empresa.com"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCreateAndAssignResponsible}
                      disabled={creatingResponsible || !newResponsibleForm.nombre.trim()}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                    >
                      {creatingResponsible
                        ? 'Guardando...'
                        : 'Crear y asignar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end">
              <button
                onClick={handleCloseResponsibleModal}
                className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}