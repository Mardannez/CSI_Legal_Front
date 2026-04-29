export function getCompanyImage(companyName?: string, companyId?: string): string {
  const name = (companyName || '').trim().toLowerCase();
  const id = (companyId || '').trim().toLowerCase();

  if (name.includes('Esencia Creativa') || id === '1') {
    return '/assets/images/LOGOTIPO-ESENCIA.jpg';
  }

  if (name.includes('Granjas Marinas') || id === '2') {
    return '/assets/images/GranjasMarinas.jpg';
  }

  return '';
}