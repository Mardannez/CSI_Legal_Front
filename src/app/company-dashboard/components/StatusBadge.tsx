interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    'Cumplido': { 
      bg: 'bg-green-100 dark:bg-green-900/30', 
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800'
    },
    'En trámite': { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    'Incumplido': { 
      bg: 'bg-red-100 dark:bg-red-900/30', 
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800'
    },
    'No aplica': { 
      bg: 'bg-gray-100 dark:bg-gray-800/30', 
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700'
    },
    'No ha sucedido': { 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    'Terceros-Incumplido': { 
      bg: 'bg-orange-100 dark:bg-orange-900/30', 
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    'Terceros-Cumplido': { 
      bg: 'bg-teal-100 dark:bg-teal-900/30', 
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800'
    },
    'Terceros – Incumplido': { 
      bg: 'bg-orange-100 dark:bg-orange-900/30', 
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    'Terceros – Cumplido': { 
      bg: 'bg-teal-100 dark:bg-teal-900/30', 
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800'
    },
  };

  const config = statusConfig[status] || statusConfig['No aplica'];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {status}
    </span>
  );
}