'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ComplianceData {
  name: string;
  value: number;
  color?: string; // ✅ ahora opcional
}

interface ComplianceChartProps {
  data: ComplianceData[];
}

// ✅ Colores fijos por estado (puedes ajustar a tu gusto)
const STATUS_COLORS: Record<string, string> = {
  'Cumplido': '#2E7D32',
  'En trámite': '#1976D2',
  'En Tramite': '#1976D2',
  'Incumplido': '#C62828',
  'No aplica': '#757575',
  'No Aplica': '#757575',
  'No ha sucedido': '#F57C00',
  'Terceros - Incumplido': '#E65100',
  'Terceros-Incumplido': '#E65100',
  'Terceros - Cumplido': '#00897B',
  'Terceros-Cumplido': '#00897B',
};

const DEFAULT_COLOR = '#111827'; // fallback (gris oscuro)

export default function ComplianceChart({ data }: ComplianceChartProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const total = useMemo(() => data.reduce((sum, item) => sum + (item.value || 0), 0), [data]);

  // ✅ Normaliza y asigna color aunque no venga desde el backend
  const normalizedData = useMemo(() => {
    return data.map((item) => {
      const resolvedColor =
        item.color ||
        STATUS_COLORS[item.name] ||
        // fallback extra: intenta normalizar acentos/casos comunes
        STATUS_COLORS[item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ||
        DEFAULT_COLOR;

      return { ...item, color: resolvedColor };
    });
  }, [data]);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1">
        <h3 className="text-lg font-semibold text-foreground mb-6">Estado de Cumplimiento</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="w-64 h-64 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const renderCustomLabel = (entry: ComplianceData) => {
    if (!total) return '0.0%';
    const percentage = ((entry.value / total) * 100).toFixed(1);
    return `${percentage}%`;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1">
      <h3 className="text-lg font-semibold text-foreground mb-6">Estado de Cumplimiento</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={normalizedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              dataKey="value"
              isAnimationActive={false}
            >
              {normalizedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLOR} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value: number) => [`${value} elementos`, 'Cantidad']}
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {normalizedData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || DEFAULT_COLOR }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-caption truncate">{item.name}</p>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}