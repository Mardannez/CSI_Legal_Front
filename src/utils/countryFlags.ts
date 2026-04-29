export function getCountryFlag(countryName?: string, countryId?: string): string {
  const name = (countryName || '').trim().toLowerCase();
  const id = (countryId || '').trim().toLowerCase();

  const flags: Record<string, string> = {
    honduras: '/assets/images/BanderaHonduras.png',
    guatemala: '/assets/images/BanderaGuatemala.png',
    hn: '/assets/images/BanderaHonduras.png',
    gt: '/assets/images/BanderaGuatemala.png',
    '1': '/assets/images/BanderaHonduras.png',
    '2': '/assets/images/BanderaGuatemala.png',
  };

  return flags[name] || flags[id] || '';
}