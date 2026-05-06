'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import { useAuth } from '@/context/AuthContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// =====================
// Tipos desde API
// =====================
type CountryOption = { id: number; name: string };
type SubCategoriaOption = { id: number; label: string };
type PeriocidadOption = { id: number; name: string };

type EstadoRequisito = 'Vigente' | 'Inactivo' | 'Vencido';

interface RequirementRow {
  id: number;
  Pais: string;
  IdPais: number;
  Categoria: string;
  IdSubCategoria: number;
  Periocidad: string | null;
  IdPeriocidad: number | null;
  NombreRequisito: string;
  DescripcionRequisito: string | null;
  ResponsableEjecucion: string | null;
  EstadoRequisito: EstadoRequisito | null;
}

interface RequirementFormData {
  IdPais: string;
  NombreRequisito: string;
  DescripcionRequisito: string;
  IdSubCategoria: string;
  IdPeriocidad: string;
  ResponsableEjecucion: string;
  EstadoRequisito: EstadoRequisito;
}

// =====================
// NUEVA LÓGICA:
// Tipos para Referencia Legal y Leyes PDF
// =====================
interface LegalReferenceRow {
  id: number;
  IdRequisito: number;
  Ambito: string;
  Articulo: string;
  Ley: string;
  Modificaciones: string | null;
  FechaRegistro?: string | null;
}

interface LegalReferenceFormData {
  Ambito: string;
  Articulo: string;
  Ley: string;
  Modificaciones: string;
}

interface LawRow {
  id: number;
  IdReferenciaLegal: number;
  NombreLey: string;
}

const ESTADOS: EstadoRequisito[] = ['Vigente', 'Inactivo', 'Vencido'];

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('CSI_Legal_token') || '';
}

function badgeClassEstado(estado: string) {
  switch (estado) {
    case 'Vigente':
      return 'bg-green-100 text-green-800';
    case 'Inactivo':
      return 'bg-gray-100 text-gray-800';
    case 'Vencido':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-muted text-foreground';
  }
}

export default function RequirementsMaintenanceInteractive() {
  const router = useRouter();

  // ==========================================================
  // SESIÓN GLOBAL
  // Tomamos el usuario logueado desde AuthContext.
  // Esto reemplaza el mockUser y el logout manual.
  // ==========================================================
  const {
    session,
    logout,
    loading: authLoading,
  } = useAuth();

  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ==========================================================
  // Combos del formulario principal de requisitos
  // ==========================================================
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [subCategorias, setSubCategorias] = useState<SubCategoriaOption[]>([]);
  const [periocidades, setPeriocidades] = useState<PeriocidadOption[]>([]);

  // ==========================================================
  // Listado principal de requisitos
  // ==========================================================
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Filtros UI
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSubCategoria, setSelectedSubCategoria] =
    useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalRecords, setTotalRecords] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  // ==========================================================
  // Modal principal: Crear / Editar requisito
  // ==========================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] =
    useState<RequirementRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<RequirementFormData>({
    IdPais: '',
    NombreRequisito: '',
    DescripcionRequisito: '',
    IdSubCategoria: '',
    IdPeriocidad: '',
    ResponsableEjecucion: '',
    EstadoRequisito: 'Vigente',
  });

  // ==========================================================
  // NUEVO MODAL:
  // Administración de Referencia Legal y Leyes PDF
  // Este modal se abre desde la tabla, por cada requisito.
  // ==========================================================
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [selectedRequirementForLegal, setSelectedRequirementForLegal] =
    useState<RequirementRow | null>(null);

  // Listado de referencias legales del requisito seleccionado
  const [legalReferences, setLegalReferences] = useState<LegalReferenceRow[]>(
    []
  );
  const [loadingLegalReferences, setLoadingLegalReferences] = useState(false);
  const [legalReferencesError, setLegalReferencesError] = useState<string | null>(
    null
  );

  // Formulario de referencia legal
  const [editingLegalReference, setEditingLegalReference] =
    useState<LegalReferenceRow | null>(null);
  const [savingLegalReference, setSavingLegalReference] = useState(false);

  const [legalFormData, setLegalFormData] = useState<LegalReferenceFormData>({
    Ambito: '',
    Articulo: '',
    Ley: '',
    Modificaciones: '',
  });

  // Referencia legal seleccionada dentro del modal
  const [selectedLegalReferenceId, setSelectedLegalReferenceId] = useState<
    number | null
  >(null);

  // Listado de leyes/pdf de la referencia legal seleccionada
  const [laws, setLaws] = useState<LawRow[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(false);
  const [lawsError, setLawsError] = useState<string | null>(null);

  // Formulario simple para subir PDF
  const [lawName, setLawName] = useState('');
  const [lawFile, setLawFile] = useState<File | null>(null);
  const [uploadingLaw, setUploadingLaw] = useState(false);

  // ==========================================================
  // Usuario visual para UserContextMenu
  // Así toda la pantalla usa el usuario real logueado.
  // ==========================================================
  const currentUser = useMemo(() => {
    const firstEmpresaRole =
      session?.empresas?.[0]?.roles?.join(', ') || 'Usuario';

    return {
      name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
      email: session?.user.correo || session?.user.usuario || '',
      role: session?.isGlobalAdmin ? 'SUPER_ADMIN' : firstEmpresaRole,
      avatar: '',
      isGlobalAdmin: !!session?.isGlobalAdmin, // <-- NUEVO
    };
  }, [session]);

  // ==========================================================
  // Hydration del componente cliente
  // ==========================================================
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ==========================================================
  // Guard de sesión:
  // Esperamos a que AuthContext termine de restaurar sesión.
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    setAuthChecked(true);
  }, [isHydrated, authLoading, session, router]);

  // ==========================================================
  // Lock de scroll:
  // cuando cualquiera de los dos modales esté abierto,
  // bloqueamos el scroll del body.
  // ==========================================================
  useEffect(() => {
    if (!isHydrated) return;

    document.body.style.overflow =
      isModalOpen || isLegalModalOpen ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isLegalModalOpen, isHydrated]);

  // ==========================================================
  // Helper fetch JSON
  // Reutiliza token del sistema y redirige a login si vence sesión.
  // ==========================================================
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
      logout();
      throw new Error('No autorizado');
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
  // Cargar combos del CRUD de requisito
  // ==========================================================
  const loadCombos = async () => {
    try {
      const paisesJson = await fetchJson(`${API_URL}/api/paises`);
      const paises = (paisesJson?.Paises || []).map((p: any) => ({
        id: Number(p.id),
        name: String(p.Pais),
      })) as CountryOption[];
      setCountries(paises);

      const subJson = await fetchJson(
        `${API_URL}/api/subcategorias/options`
      );
      const subs = (subJson?.SubCategorias || []).map((s: any) => ({
        id: Number(s.IdSubCategoria ?? s.id ?? s.IdSubcategoria),
        label: String(s.Label),
      })) as SubCategoriaOption[];
      setSubCategorias(subs);

      const perJson = await fetchJson(`${API_URL}/api/periocidad`);
      const pers = (perJson?.Periocidades || []).map((p: any) => ({
        id: Number(p.id),
        name: String(p.Periocidad),
      })) as PeriocidadOption[];
      setPeriocidades(pers);
    } catch (e: any) {
      console.warn(
        '[RequirementsMaintenance] loadCombos error:',
        e?.message || e
      );
    }
  };

  // ==========================================================
  // Cargar listado principal de requisitos
  // ==========================================================
  const loadRequirements = async () => {
    setListLoading(true);
    setListError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(itemsPerPage));

      if (selectedCountry !== 'all')
        params.set('countryId', selectedCountry);
      if (selectedSubCategoria !== 'all')
        params.set('subCategoriaId', selectedSubCategoria);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const json = await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento?${params.toString()}`
      );

      setRequirements((json?.Requisitos || []) as RequirementRow[]);
      setTotalRecords(Number(json?.Pagination?.total || 0));
    } catch (e: any) {
      setListError(e?.message || 'Error cargando requisitos');
      setRequirements([]);
      setTotalRecords(0);
    } finally {
      setListLoading(false);
    }
  };

  // ==========================================================
  // Cargar referencias legales de un requisito
  // Esta es la entrada principal del nuevo modal.
  // ==========================================================
  const loadLegalReferences = async (
    requirementId: number,
    preferredReferenceId?: number | null
  ) => {
    setLoadingLegalReferences(true);
    setLegalReferencesError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/requisitos/${requirementId}/referencias-legales`
      );

      const refs = (json?.ReferenciasLegales || []) as LegalReferenceRow[];
      setLegalReferences(refs);

      const nextSelectedId =
        preferredReferenceId ??
        (refs.length > 0 ? Number(refs[0].id) : null);

      setSelectedLegalReferenceId(nextSelectedId);

      if (nextSelectedId) {
        await loadLaws(nextSelectedId);
      } else {
        setLaws([]);
        setLawsError(null);
      }
    } catch (e: any) {
      setLegalReferencesError(
        e?.message || 'Error cargando referencias legales'
      );
      setLegalReferences([]);
      setSelectedLegalReferenceId(null);
      setLaws([]);
    } finally {
      setLoadingLegalReferences(false);
    }
  };

  // ==========================================================
  // Cargar leyes/PDF de una referencia legal
  // ==========================================================
  const loadLaws = async (idReferenciaLegal: number) => {
    setLoadingLaws(true);
    setLawsError(null);

    try {
      const json = await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/referencias-legales/${idReferenciaLegal}/leyes`
      );

      setLaws((json?.Leyes || []) as LawRow[]);
    } catch (e: any) {
      setLawsError(e?.message || 'Error cargando leyes');
      setLaws([]);
    } finally {
      setLoadingLaws(false);
    }
  };

  // ==========================================================
  // Carga inicial de combos
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;
    loadCombos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, authChecked]);

  // ==========================================================
  // Recargar listado cuando cambien filtros o página
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;
    loadRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, authChecked, selectedCountry, selectedSubCategoria, currentPage]);

  // ==========================================================
  // Debounce para búsqueda
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;

    const t = setTimeout(() => {
      setCurrentPage(1);
      loadRequirements();
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ==========================================================
  // Modal principal: abrir / cerrar requisito
  // ==========================================================
  const handleOpenModal = (req?: RequirementRow) => {
    if (req) {
      setEditingRequirement(req);
      setFormData({
        IdPais: String(req.IdPais),
        NombreRequisito: req.NombreRequisito || '',
        DescripcionRequisito: req.DescripcionRequisito || '',
        IdSubCategoria: String(req.IdSubCategoria),
        IdPeriocidad: req.IdPeriocidad ? String(req.IdPeriocidad) : '',
        ResponsableEjecucion: req.ResponsableEjecucion || '',
        EstadoRequisito: (req.EstadoRequisito || 'Vigente') as EstadoRequisito,
      });
    } else {
      setEditingRequirement(null);
      setFormData({
        IdPais: '',
        NombreRequisito: '',
        DescripcionRequisito: '',
        IdSubCategoria: '',
        IdPeriocidad: '',
        ResponsableEjecucion: '',
        EstadoRequisito: 'Vigente',
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRequirement(null);
  };

  // ==========================================================
  // NUEVO MODAL: abrir / cerrar referencia legal
  // Se abre desde la fila del requisito ya creado.
  // ==========================================================
  const resetLegalForm = () => {
    setEditingLegalReference(null);
    setLegalFormData({
      Ambito: '',
      Articulo: '',
      Ley: '',
      Modificaciones: '',
    });
  };

  const handleOpenLegalModal = async (req: RequirementRow) => {
    setSelectedRequirementForLegal(req);
    setIsLegalModalOpen(true);
    resetLegalForm();
    setLawName('');
    setLawFile(null);
    setLaws([]);
    setLawsError(null);
    await loadLegalReferences(req.id);
  };

  const handleCloseLegalModal = () => {
    setIsLegalModalOpen(false);
    setSelectedRequirementForLegal(null);
    setLegalReferences([]);
    setLegalReferencesError(null);
    setSelectedLegalReferenceId(null);
    setLaws([]);
    setLawsError(null);
    setLawName('');
    setLawFile(null);
    resetLegalForm();
  };

  // ==========================================================
  // Create / Update requisito
  // ==========================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.IdPais) return alert('Seleccione un país');
    if (!formData.NombreRequisito.trim()) return alert('Ingrese nombre');
    if (!formData.DescripcionRequisito.trim())
      return alert('Ingrese descripción');
    if (!formData.IdSubCategoria)
      return alert('Seleccione una subcategoría');
    if (!formData.IdPeriocidad)
      return alert('Seleccione periodicidad');

    const payload = {
      NombreRequisito: formData.NombreRequisito.trim(),
      DescripcionRequisito: formData.DescripcionRequisito.trim(),
      IdPais: Number(formData.IdPais),
      IdSubCategoria: Number(formData.IdSubCategoria),
      IdPeriocidad: formData.IdPeriocidad
        ? Number(formData.IdPeriocidad)
        : null,
      ResponsableEjecucion: formData.ResponsableEjecucion.trim(),
      EstadoRequisito: formData.EstadoRequisito,
    };

    setSaving(true);
    try {
      if (editingRequirement) {
        await fetchJson(
          `${API_URL}/api/requisitos-mantenimiento/${editingRequirement.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      } else {
        await fetchJson(`${API_URL}/api/requisitos-mantenimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      handleCloseModal();
      await loadRequirements();
    } catch (e: any) {
      alert(e?.message || 'Error guardando requisito');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // Delete (inactivar) requisito
  // ==========================================================
  const handleDelete = async (id: number) => {
    if (!confirm('¿Desea inactivar este requisito?')) return;

    try {
      await fetchJson(`${API_URL}/api/requisitos-mantenimiento/${id}`, {
        method: 'DELETE',
      });
      await loadRequirements();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando (inactivando) requisito');
    }
  };

  // ==========================================================
  // Duplicate requisito
  // ==========================================================
  const handleDuplicate = async (req: RequirementRow) => {
    if (!confirm('¿Desea duplicar este requisito?')) return;

    const payload = {
      NombreRequisito: `${req.NombreRequisito} (Copia)`,
      DescripcionRequisito: req.DescripcionRequisito || '',
      IdPais: Number(req.IdPais),
      IdSubCategoria: Number(req.IdSubCategoria),
      IdPeriocidad: req.IdPeriocidad ? Number(req.IdPeriocidad) : null,
      ResponsableEjecucion: req.ResponsableEjecucion || '',
      EstadoRequisito: (req.EstadoRequisito || 'Vigente') as EstadoRequisito,
    };

    try {
      await fetchJson(`${API_URL}/api/requisitos-mantenimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await loadRequirements();
    } catch (e: any) {
      alert(e?.message || 'Error duplicando requisito');
    }
  };

  // ==========================================================
  // NUEVA LÓGICA:
  // Crear / Editar referencia legal
  // ==========================================================
  const handleSaveLegalReference = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequirementForLegal) {
      return alert('No hay requisito seleccionado');
    }

    if (!legalFormData.Ambito.trim()) return alert('Ingrese ámbito');
    if (!legalFormData.Articulo.trim()) return alert('Ingrese artículo');
    if (!legalFormData.Ley.trim()) return alert('Ingrese ley');

    const payload = {
      Ambito: legalFormData.Ambito.trim(),
      Articulo: legalFormData.Articulo.trim(),
      Ley: legalFormData.Ley.trim(),
      Modificaciones: legalFormData.Modificaciones.trim(),
    };

    setSavingLegalReference(true);

    try {
      if (editingLegalReference) {
        await fetchJson(
          `${API_URL}/api/requisitos-mantenimiento/referencias-legales/${editingLegalReference.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        await loadLegalReferences(
          selectedRequirementForLegal.id,
          editingLegalReference.id
        );
      } else {
        const json = await fetchJson(
          `${API_URL}/api/requisitos-mantenimiento/requisitos/${selectedRequirementForLegal.id}/referencias-legales`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        const newId = Number(json?.ReferenciaLegal?.id || 0) || null;
        await loadLegalReferences(selectedRequirementForLegal.id, newId);
      }

      resetLegalForm();
    } catch (e: any) {
      alert(e?.message || 'Error guardando referencia legal');
    } finally {
      setSavingLegalReference(false);
    }
  };

  const handleEditLegalReference = (ref: LegalReferenceRow) => {
    setEditingLegalReference(ref);
    setLegalFormData({
      Ambito: ref.Ambito || '',
      Articulo: ref.Articulo || '',
      Ley: ref.Ley || '',
      Modificaciones: ref.Modificaciones || '',
    });
    setSelectedLegalReferenceId(ref.id);
  };

  const handleDeleteLegalReference = async (ref: LegalReferenceRow) => {
    if (
      !confirm(
        `¿Desea eliminar la referencia legal "${ref.Articulo} - ${ref.Ley}"?`
      )
    ) {
      return;
    }

    try {
      await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/referencias-legales/${ref.id}`,
        { method: 'DELETE' }
      );

      if (!selectedRequirementForLegal) return;

      await loadLegalReferences(selectedRequirementForLegal.id);
      resetLegalForm();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando referencia legal');
    }
  };

  // ==========================================================
  // NUEVA LÓGICA:
  // Al seleccionar una referencia, cargamos sus leyes/PDF.
  // ==========================================================
  const handleSelectLegalReference = async (refId: number) => {
    setSelectedLegalReferenceId(refId);
    await loadLaws(refId);
  };

  // ==========================================================
  // NUEVA LÓGICA:
  // Subir PDF de ley para una referencia legal
  // Este endpoint usa form-data porque lleva archivo.
  // ==========================================================
  const handleUploadLaw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLegalReferenceId) {
      return alert('Seleccione primero una referencia legal');
    }

    if (!lawName.trim()) {
      return alert('Ingrese el nombre de la ley');
    }

    if (!lawFile) {
      return alert('Seleccione un archivo PDF');
    }

    const token = getToken();
    const form = new FormData();
    form.append('nombreLey', lawName.trim());
    form.append('documento', lawFile);

    setUploadingLaw(true);

    try {
      const res = await fetch(
        `${API_URL}/api/requisitos-mantenimiento/referencias-legales/${selectedLegalReferenceId}/leyes`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: form,
        }
      );

      if (res.status === 401) {
        logout();
        throw new Error('No autorizado');
      }

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Error subiendo PDF');
      }

      setLawName('');
      setLawFile(null);
      await loadLaws(selectedLegalReferenceId);
    } catch (e: any) {
      alert(e?.message || 'Error subiendo ley PDF');
    } finally {
      setUploadingLaw(false);
    }
  };

  // ==========================================================
  // NUEVA LÓGICA:
  // Descargar PDF protegido con token.
  // Lo bajamos como blob y creamos una URL temporal.
  // ==========================================================
  const handleDownloadLaw = async (law: LawRow) => {
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
        logout();
        throw new Error('No autorizado');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error descargando PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${law.NombreLey}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Error descargando ley');
    }
  };

  // ==========================================================
  // NUEVA LÓGICA:
  // Eliminar ley PDF
  // ==========================================================
  const handleDeleteLaw = async (law: LawRow) => {
    if (!confirm(`¿Desea eliminar la ley "${law.NombreLey}"?`)) return;

    try {
      await fetchJson(
        `${API_URL}/api/requisitos-mantenimiento/leyes/${law.id}`,
        { method: 'DELETE' }
      );

      if (selectedLegalReferenceId) {
        await loadLaws(selectedLegalReferenceId);
      }
    } catch (e: any) {
      alert(e?.message || 'Error eliminando ley');
    }
  };

  // ==========================================================
  // UI Helpers
  // ==========================================================
  const handleLogout = () => {
    logout();
  };

  const fromIndex = (currentPage - 1) * itemsPerPage + 1;
  const toIndex = Math.min(
    (currentPage - 1) * itemsPerPage + requirements.length,
    totalRecords
  );

  const selectedLegalReference = useMemo(() => {
    if (!selectedLegalReferenceId) return null;
    return (
      legalReferences.find((ref) => ref.id === selectedLegalReferenceId) || null
    );
  }, [legalReferences, selectedLegalReferenceId]);

  // ==========================================================
  // Loading general
  // ==========================================================
  if (!isHydrated || authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <AppImage
                src="/assets/images/CSI-LOGO-05-1771034129124.png"
                alt="CSISL Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>

            <UserContextMenu user={currentUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-6 py-6">
        <BreadcrumbNavigation />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Mantenimiento de Requisitos
          </h1>
          <p className="text-muted-foreground">
            Gestione los requisitos específicos por país y subcategoría
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                País
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="all">Todos los países</option>
                {countries.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categoría
              </label>
              <select
                value={selectedSubCategoria}
                onChange={(e) => {
                  setSelectedSubCategoria(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="all">Todas las categorías</option>
                {subCategorias.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                * Este combo guarda <b>IdSubCategoria</b> (la categoría está
                implícita).
              </p>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Buscar
              </label>
              <div className="relative">
                <Icon
                  name="MagnifyingGlassIcon"
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Buscar requisitos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nuevo Requisito</span>
            </button>
          </div>
        </div>

        {listError && (
          <div className="bg-error/10 border border-error rounded-md p-4 text-error mb-6">
            {listError}
          </div>
        )}

        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elevation-1">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    País
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Requisito
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Categoría
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Periodicidad
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Responsable
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {listLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-64" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-48" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-32" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse w-28 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  requirements.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-muted/50 transition-smooth"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground">
                          {req.Pais}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {req.NombreRequisito}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {req.DescripcionRequisito || ''}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {req.Categoria}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {req.Periocidad || '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {req.ResponsableEjecucion || '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClassEstado(
                            req.EstadoRequisito || 'Vigente'
                          )}`}
                        >
                          {req.EstadoRequisito || 'Vigente'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Editar requisito */}
                          <button
                            onClick={() => handleOpenModal(req)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                            title="Editar"
                          >
                            <Icon name="PencilIcon" size={18} />
                          </button>

                          {/* NUEVA ACCIÓN:
                              Referencia Legal abre el segundo modal.
                              Aquí no editas el requisito, sino sus fundamentos legales y PDFs. */}
                          <button
                            onClick={() => handleOpenLegalModal(req)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                            title="Referencia Legal"
                          >
                            <Icon name="DocumentTextIcon" size={18} />
                          </button>

                          {/* Duplicar requisito */}
                          <button
                            onClick={() => handleDuplicate(req)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                            title="Duplicar"
                          >
                            <Icon
                              name="DocumentDuplicateIcon"
                              size={18}
                            />
                          </button>

                          {/* Inactivar requisito */}
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                            title="Inactivar"
                          >
                            <Icon name="TrashIcon" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {!listLoading && requirements.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay requisitos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-border">
            {requirements.map((req) => (
              <div
                key={req.id}
                className="p-4 hover:bg-muted/50 transition-smooth"
              >
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary mb-1">
                        {req.Pais}
                      </p>
                      <h3 className="font-medium text-foreground">
                        {req.NombreRequisito}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${badgeClassEstado(
                        req.EstadoRequisito || 'Vigente'
                      )}`}
                    >
                      {req.EstadoRequisito || 'Vigente'}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {req.DescripcionRequisito || ''}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-1 rounded">
                      {req.Categoria}
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      {req.Periocidad || '—'}
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      {req.ResponsableEjecucion || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenModal(req)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                    title="Editar"
                  >
                    <Icon name="PencilIcon" size={18} />
                  </button>

                  <button
                    onClick={() => handleOpenLegalModal(req)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                    title="Referencia Legal"
                  >
                    <Icon name="DocumentTextIcon" size={18} />
                  </button>

                  <button
                    onClick={() => handleDuplicate(req)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                    title="Duplicar"
                  >
                    <Icon name="DocumentDuplicateIcon" size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                    title="Inactivar"
                  >
                    <Icon name="TrashIcon" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalRecords > 0 && (
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {fromIndex} a {toIndex} de {totalRecords} requisitos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="ChevronLeftIcon" size={20} />
                  </button>

                  <span className="text-sm font-medium text-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="ChevronRightIcon" size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================
          MODAL 1: Crear / Editar requisito
         ====================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingRequirement
                  ? 'Editar Requisito'
                  : 'Nuevo Requisito'}
              </h2>

              <button
                onClick={handleCloseModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    País <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={formData.IdPais}
                    onChange={(e) =>
                      setFormData({ ...formData, IdPais: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  >
                    <option value="">Seleccione un país</option>
                    {countries.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre del Requisito <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.NombreRequisito}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        NombreRequisito: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    placeholder="Ej: Licencia municipal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción <span className="text-error">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.DescripcionRequisito}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        DescripcionRequisito: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth resize-none"
                    placeholder="Describa el requisito en detalle"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Categoría <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData.IdSubCategoria}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          IdSubCategoria: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    >
                      <option value="">Seleccione una subcategoría</option>
                      {subCategorias.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-muted-foreground mt-1">
                      * Se guardará <b>IdSubCategoria</b>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Periodicidad <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData.IdPeriocidad}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          IdPeriocidad: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    >
                      <option value="">Seleccione periodicidad</option>
                      {periocidades.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Responsable <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ResponsableEjecucion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ResponsableEjecucion: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                      placeholder="Ej: Recursos Humanos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estado <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData.EstadoRequisito}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          EstadoRequisito: e.target.value as EstadoRequisito,
                        })
                      }
                      className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                    >
                      {ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth shadow-elevation-1 disabled:opacity-50"
                >
                  {saving
                    ? 'Guardando...'
                    : editingRequirement
                    ? 'Guardar Cambios'
                    : 'Crear Requisito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL 2: Referencia Legal y Leyes PDF
          Aquí no creas el requisito; aquí administras:
          - referencias legales del requisito
          - leyes PDF de cada referencia
         ====================================================== */}
      {isLegalModalOpen && selectedRequirementForLegal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Referencia Legal
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Requisito: <b>{selectedRequirementForLegal.NombreRequisito}</b>
                </p>
              </div>

              <button
                onClick={handleCloseLegalModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-smooth"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ==================================================
                  BLOQUE 1:
                  Formulario de referencia legal
                 ================================================== */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="border border-border rounded-lg p-5 bg-background">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {editingLegalReference
                          ? 'Editar Referencia Legal'
                          : 'Nueva Referencia Legal'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Este bloque guarda la base legal del requisito seleccionado.
                      </p>
                    </div>

                    {editingLegalReference ? (
                      <button
                        type="button"
                        onClick={resetLegalForm}
                        className="text-sm text-primary hover:text-primary/80 transition-smooth"
                      >
                        Nueva
                      </button>
                    ) : null}
                  </div>

                  <form onSubmit={handleSaveLegalReference} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ámbito <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={legalFormData.Ambito}
                        onChange={(e) =>
                          setLegalFormData({
                            ...legalFormData,
                            Ambito: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Ej: HN - Honduras"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Artículo <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={legalFormData.Articulo}
                        onChange={(e) =>
                          setLegalFormData({
                            ...legalFormData,
                            Articulo: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Ej: Artículo 5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ley <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={legalFormData.Ley}
                        onChange={(e) =>
                          setLegalFormData({
                            ...legalFormData,
                            Ley: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="Ej: Decreto 104-93 - Ley General del Ambiente"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Modificaciones
                      </label>
                      <textarea
                        rows={3}
                        value={legalFormData.Modificaciones}
                        onChange={(e) =>
                          setLegalFormData({
                            ...legalFormData,
                            Modificaciones: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                        placeholder="Ej: Última modificación: 19/12/2017"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {editingLegalReference ? (
                        <button
                          type="button"
                          onClick={resetLegalForm}
                          className="px-4 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
                        >
                          Cancelar edición
                        </button>
                      ) : null}

                      <button
                        type="submit"
                        disabled={savingLegalReference}
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {savingLegalReference
                          ? 'Guardando...'
                          : editingLegalReference
                          ? 'Actualizar Referencia'
                          : 'Crear Referencia'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ==================================================
                    BLOQUE 2:
                    Lista de referencias legales del requisito
                    Al seleccionar una, abajo se cargan sus leyes.
                   ================================================== */}
                <div className="border border-border rounded-lg p-5 bg-background">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Referencias del Requisito
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aquí se listan todas las referencias legales asociadas al requisito.
                  </p>

                  {legalReferencesError ? (
                    <div className="mb-4 bg-error/10 border border-error rounded-md p-3 text-sm text-error">
                      {legalReferencesError}
                    </div>
                  ) : null}

                  {loadingLegalReferences ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 rounded-md bg-muted animate-pulse"
                        />
                      ))}
                    </div>
                  ) : legalReferences.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4">
                      Este requisito aún no tiene referencias legales registradas.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {legalReferences.map((ref) => {
                        const isSelected = ref.id === selectedLegalReferenceId;

                        return (
                          <div
                            key={ref.id}
                            className={`rounded-md border p-4 transition-smooth ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => handleSelectLegalReference(ref.id)}
                                className="flex-1 text-left"
                              >
                                <p className="text-sm font-semibold text-foreground">
                                  {ref.Articulo}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {ref.Ley}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Ámbito: {ref.Ambito}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Modificaciones: {ref.Modificaciones || '—'}
                                </p>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditLegalReference(ref)}
                                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                                  title="Editar referencia"
                                >
                                  <Icon name="PencilIcon" size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLegalReference(ref)}
                                  className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                                  title="Eliminar referencia"
                                >
                                  <Icon name="TrashIcon" size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ==================================================
                  BLOQUE 3:
                  Leyes / PDFs de la referencia seleccionada
                  Este bloque depende de selectedLegalReferenceId.
                 ================================================== */}
              <div className="border border-border rounded-lg p-5 bg-background">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Leyes / PDFs asociados
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecciona una referencia legal para cargar o consultar sus documentos.
                  </p>
                </div>

                {!selectedLegalReference ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4">
                    Selecciona una referencia legal para administrar sus leyes PDF.
                  </div>
                ) : (
                  <>
                    <div className="mb-5 rounded-md border border-border bg-muted/20 p-4">
                      <p className="text-sm text-foreground">
                        <b>Referencia seleccionada:</b> {selectedLegalReference.Articulo}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLegalReference.Ley}
                      </p>
                    </div>

                    {/* Formulario de subida PDF */}
                    <form
                      onSubmit={handleUploadLaw}
                      className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end mb-6"
                    >
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Nombre de la ley <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          value={lawName}
                          onChange={(e) => setLawName(e.target.value)}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground"
                          placeholder="Ej: Decreto 104-93 - Ley General del Ambiente"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Documento PDF <span className="text-error">*</span>
                        </label>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(e) =>
                            setLawFile(e.target.files?.[0] || null)
                          }
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={uploadingLaw}
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-smooth disabled:opacity-50"
                      >
                        {uploadingLaw ? 'Subiendo...' : 'Subir PDF'}
                      </button>
                    </form>

                    {lawsError ? (
                      <div className="mb-4 bg-error/10 border border-error rounded-md p-3 text-sm text-error">
                        {lawsError}
                      </div>
                    ) : null}

                    {loadingLaws ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-14 rounded-md bg-muted animate-pulse"
                          />
                        ))}
                      </div>
                    ) : laws.length === 0 ? (
                      <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4">
                        Esta referencia legal aún no tiene leyes PDF asociadas.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {laws.map((law) => (
                          <div
                            key={law.id}
                            className="rounded-md border border-border p-4 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-md bg-muted">
                                <Icon
                                  name="DocumentTextIcon"
                                  size={18}
                                  className="text-primary"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {law.NombreLey}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID Ley: {law.id}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadLaw(law)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                                title="Descargar PDF"
                              >
                                <Icon name="ArrowDownTrayIcon" size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLaw(law)}
                                className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-md transition-smooth"
                                title="Eliminar ley"
                              >
                                <Icon name="TrashIcon" size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCloseLegalModal}
                className="px-6 py-2 text-sm font-medium text-foreground border border-input rounded-md hover:bg-muted transition-smooth"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}