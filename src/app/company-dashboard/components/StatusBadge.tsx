interface StatusBadgeProps {
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  cumplido: '#2E7D32',
  'en tramite': '#1976D2',
  incumplido: '#C62828',
  'no aplica': '#757575',
  'no ha sucedido': '#F57C00',
  'terceros-incumplido': '#E65100',
  'terceros-cumplido': '#00897B',
};

const DEFAULT_COLOR = '#757575';

function normalizeStatusKey(status?: string | null) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—â€“â€”]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[normalizeStatusKey(status)] || DEFAULT_COLOR;

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: `${color}1A`,
        borderColor: `${color}40`,
        color,
      }}
    >
      {status}
    </span>
  );
}
