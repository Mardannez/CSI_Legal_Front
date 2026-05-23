'use client';

import { useEffect, useMemo, useState } from 'react';

interface ComplianceData {
  name: string;
  value: number;
  color?: string;
}

interface ComplianceChartProps {
  data: ComplianceData[];
}

type ChartSlice = ComplianceData & {
  color: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  percentage: number;
};

const STATUS_COLORS: Record<string, string> = {
  cumplido: '#2E7D32',
  'en tramite': '#1976D2',
  incumplido: '#C62828',
  'no aplica': '#757575',
  'no ha sucedido': '#F57C00',
  'terceros-incumplido': '#E65100',
  'terceros-cumplido': '#00897B',
};

const DEFAULT_COLOR = '#111827';

function normalizeStatusKey(status?: string | null) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—â€“â€”Ã¢â‚¬â€œÃ¢â‚¬â€]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function darkenHex(hex: string, amount = 0.36) {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);

  const next = [r, g, b]
    .map((channel) =>
      Math.max(0, Math.round(channel * (1 - amount)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('');

  return `#${next}`;
}

function polarPoint(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number
) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(radians),
    y: cy + ry * Math.sin(radians),
  };
}

function slicePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarPoint(cx, cy, rx, ry, startAngle);
  const end = polarPoint(cx, cy, rx, ry, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ComplianceChart({ data }: ComplianceChartProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const total = useMemo(
    () => data.reduce((sum, item) => sum + (item.value || 0), 0),
    [data]
  );

  const normalizedData = useMemo(() => {
    return data.map((item) => {
      const color =
        item.color ||
        STATUS_COLORS[normalizeStatusKey(item.name)] ||
        DEFAULT_COLOR;

      return { ...item, color };
    });
  }, [data]);

  const visibleSlices = useMemo<ChartSlice[]>(() => {
    if (!total) return [];

    let cursor = -18;

    return normalizedData
      .filter((item) => item.value > 0)
      .map((item) => {
        const sweep = (item.value / total) * 360;
        const startAngle = cursor;
        const endAngle = cursor + sweep;
        cursor = endAngle;

        return {
          ...item,
          startAngle,
          endAngle,
          midAngle: startAngle + sweep / 2,
          percentage: (item.value / total) * 100,
        };
      });
  }, [normalizedData, total]);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Estado de Cumplimiento
        </h3>
        <div className="h-96 flex items-center justify-center">
          <div className="w-72 h-40 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1">
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Estado de Cumplimiento
      </h3>

      <div className="relative h-[430px] overflow-hidden rounded-md bg-background">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No hay datos para graficar
          </div>
        ) : (
          <svg
            viewBox="0 0 760 430"
            role="img"
            aria-label="Grafico de estado de cumplimiento"
            className="h-full w-full"
          >
            <defs>
              <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow
                  dx="0"
                  dy="18"
                  stdDeviation="14"
                  floodColor="#111827"
                  floodOpacity="0.18"
                />
              </filter>
            </defs>

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 204;
              const rx = 184;
              const ry = 92;
              const depth = 44;
              const explode = 18;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;

              return (
                <path
                  key={`base-${slice.name}-${index}`}
                  d={slicePath(
                    cx + ox,
                    cy + oy + depth,
                    rx,
                    ry,
                    slice.startAngle,
                    slice.endAngle
                  )}
                  fill={darkenHex(slice.color)}
                  opacity="0.96"
                />
              );
            })}

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 204;
              const rx = 184;
              const ry = 92;
              const explode = 18;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;

              return (
                <path
                  key={`top-${slice.name}-${index}`}
                  d={slicePath(
                    cx + ox,
                    cy + oy,
                    rx,
                    ry,
                    slice.startAngle,
                    slice.endAngle
                  )}
                  fill={slice.color}
                  stroke="var(--color-card)"
                  strokeWidth="3"
                  filter="url(#pie-shadow)"
                />
              );
            })}

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 204;
              const rx = 196;
              const ry = 104;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const anchor = polarPoint(cx, cy, rx, ry, slice.midAngle);
              const labelX = clamp(cx + Math.cos(radians) * 292, 72, 640);
              const labelY = clamp(cy + Math.sin(radians) * 176, 46, 364);
              const boxWidth = 126;
              const boxHeight = 54;
              const isRight = labelX >= cx;
              const boxX = isRight ? labelX : labelX - boxWidth;
              const boxY = labelY - boxHeight / 2;
              const elbowX = isRight ? boxX - 18 : boxX + boxWidth + 18;
              const boxEdgeX = isRight ? boxX : boxX + boxWidth;

              return (
                <g key={`label-${slice.name}-${index}`}>
                  <path
                    d={`M ${anchor.x} ${anchor.y} L ${elbowX} ${anchor.y} L ${boxEdgeX} ${labelY}`}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={anchor.x} cy={anchor.y} r="5" fill={slice.color} />
                  <rect
                    x={boxX}
                    y={boxY}
                    width={boxWidth}
                    height={boxHeight}
                    rx="10"
                    fill="var(--color-card)"
                    stroke={slice.color}
                    strokeWidth="4"
                  />
                  <text
                    x={boxX + boxWidth / 2}
                    y={boxY + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] font-semibold uppercase"
                  >
                    {slice.name.length > 18
                      ? `${slice.name.slice(0, 18)}...`
                      : slice.name}
                  </text>
                  <text
                    x={boxX + boxWidth / 2}
                    y={boxY + 42}
                    textAnchor="middle"
                    className="fill-foreground text-[24px] font-bold"
                  >
                    {slice.percentage.toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {normalizedData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color || DEFAULT_COLOR }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-caption truncate">
                {item.name}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
