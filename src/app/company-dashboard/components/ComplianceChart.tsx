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

type LabelLayout = {
  index: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'end';
  elbowX: number;
  endX: number;
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

function ringPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  innerRx: number,
  innerRy: number,
  startAngle: number,
  endAngle: number
) {
  const safeEndAngle =
    endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const outerStart = polarPoint(cx, cy, rx, ry, startAngle);
  const outerEnd = polarPoint(cx, cy, rx, ry, safeEndAngle);
  const innerStart = polarPoint(cx, cy, innerRx, innerRy, startAngle);
  const innerEnd = polarPoint(cx, cy, innerRx, innerRy, safeEndAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rx} ${ry} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRx} ${innerRy} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function outerWallPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  depth: number,
  startAngle: number,
  endAngle: number
) {
  const safeEndAngle =
    endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const outerStart = polarPoint(cx, cy, rx, ry, startAngle);
  const outerEnd = polarPoint(cx, cy, rx, ry, safeEndAngle);
  const bottomStart = polarPoint(cx, cy + depth, rx, ry, startAngle);
  const bottomEnd = polarPoint(cx, cy + depth, rx, ry, safeEndAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rx} ${ry} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${bottomEnd.x} ${bottomEnd.y}`,
    `A ${rx} ${ry} 0 ${largeArc} 0 ${bottomStart.x} ${bottomStart.y}`,
    'Z',
  ].join(' ');
}

function innerWallPath(
  cx: number,
  cy: number,
  innerRx: number,
  innerRy: number,
  depth: number,
  startAngle: number,
  endAngle: number
) {
  const safeEndAngle =
    endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const innerStart = polarPoint(cx, cy, innerRx, innerRy, startAngle);
  const innerEnd = polarPoint(cx, cy, innerRx, innerRy, safeEndAngle);
  const bottomStart = polarPoint(cx, cy + depth, innerRx, innerRy, startAngle);
  const bottomEnd = polarPoint(cx, cy + depth, innerRx, innerRy, safeEndAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRx} ${innerRy} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    `L ${bottomStart.x} ${bottomStart.y}`,
    `A ${innerRx} ${innerRy} 0 ${largeArc} 1 ${bottomEnd.x} ${bottomEnd.y}`,
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

  const labelLayouts = useMemo<LabelLayout[]>(() => {
    const cx = 380;
    const cy = 194;
    const minY = 42;
    const maxY = 374;
    const labelGap = 40;

    const layouts = visibleSlices.map((slice, index) => {
      const radians = ((slice.midAngle - 90) * Math.PI) / 180;
      const isRight = Math.cos(radians) >= 0;
      const desiredY = clamp(cy + Math.sin(radians) * 172, minY, maxY);
      const labelX = isRight ? 610 : 150;
      const textAnchor: 'start' | 'end' = isRight ? 'start' : 'end';

      return {
        index,
        desiredY,
        isRight,
        labelX,
        labelY: desiredY,
        textAnchor,
        elbowX: isRight ? labelX - 52 : labelX + 52,
        endX: isRight ? labelX - 10 : labelX + 10,
      };
    });

    const assignLanes = (isRight: boolean) => {
      const side = layouts
        .filter((layout) => layout.isRight === isRight)
        .sort((a, b) => a.desiredY - b.desiredY);

      let previousY = minY - labelGap;

      side.forEach((layout) => {
        layout.labelY = Math.max(layout.desiredY, previousY + labelGap);
        previousY = layout.labelY;
      });

      const overflow = side.length ? side[side.length - 1].labelY - maxY : 0;
      if (overflow > 0) {
        side.forEach((layout) => {
          layout.labelY = Math.max(minY, layout.labelY - overflow);
        });
      }
    };

    assignLanes(false);
    assignLanes(true);

    return layouts;
  }, [visibleSlices]);

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
              <linearGradient id="donut-surface" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="52%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            <ellipse
              cx="378"
              cy="286"
              rx="222"
              ry="88"
              fill="#111827"
              opacity="0.08"
            />

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 194;
              const rx = 198;
              const ry = 94;
              const innerRx = 86;
              const innerRy = 40;
              const depth = 54;
              const explode = 12;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;

              return (
                <path
                  key={`base-${slice.name}-${index}`}
                  d={ringPath(
                    cx + ox,
                    cy + oy + depth,
                    rx,
                    ry,
                    innerRx,
                    innerRy,
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
              const cy = 194;
              const rx = 198;
              const ry = 94;
              const innerRx = 86;
              const innerRy = 40;
              const depth = 54;
              const explode = 12;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;

              return (
                <g key={`walls-${slice.name}-${index}`} filter="url(#pie-shadow)">
                  <path
                    d={outerWallPath(
                      cx + ox,
                      cy + oy,
                      rx,
                      ry,
                      depth,
                      slice.startAngle,
                      slice.endAngle
                    )}
                    fill={darkenHex(slice.color, 0.22)}
                    opacity="0.9"
                  />
                  <path
                    d={innerWallPath(
                      cx + ox,
                      cy + oy,
                      innerRx,
                      innerRy,
                      depth,
                      slice.startAngle,
                      slice.endAngle
                    )}
                    fill={darkenHex(slice.color, 0.46)}
                    opacity="0.76"
                  />
                </g>
              );
            })}

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 194;
              const rx = 198;
              const ry = 94;
              const innerRx = 86;
              const innerRy = 40;
              const explode = 12;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;
              const anchor = polarPoint(
                cx + ox,
                cy + oy,
                rx + 8,
                ry + 4,
                slice.midAngle
              );

              return (
                <g key={`top-${slice.name}-${index}`}>
                  <path
                    d={ringPath(
                      cx + ox,
                      cy + oy,
                      rx,
                      ry,
                      innerRx,
                      innerRy,
                      slice.startAngle,
                      slice.endAngle
                    )}
                    fill={slice.color}
                    stroke="var(--color-card)"
                    strokeWidth="3"
                  />
                  {slice.endAngle - slice.startAngle > 1 && (
                    <path
                      d={ringPath(
                        cx + ox,
                        cy + oy,
                        rx - 1,
                        ry - 1,
                        innerRx + 1,
                        innerRy + 1,
                        slice.startAngle + 0.4,
                        slice.endAngle - 0.4
                      )}
                      fill="url(#donut-surface)"
                      opacity="0.72"
                    />
                  )}
                  <circle cx={anchor.x} cy={anchor.y} r="2.5" fill="#111827" opacity="0.5" />
                </g>
              );
            })}

            {visibleSlices.map((slice, index) => {
              const cx = 380;
              const cy = 194;
              const rx = 218;
              const ry = 104;
              const explode = 12;
              const radians = ((slice.midAngle - 90) * Math.PI) / 180;
              const ox = Math.cos(radians) * explode;
              const oy = Math.sin(radians) * explode;
              const anchor = polarPoint(cx, cy, rx, ry, slice.midAngle);
              const layout = labelLayouts.find((item) => item.index === index);
              if (!layout) return null;

              const { labelX, labelY, textAnchor, elbowX, endX } = layout;
              const title = slice.name.length > 23
                ? `${slice.name.slice(0, 23)}...`
                : slice.name;

              return (
                <g key={`label-${slice.name}-${index}`}>
                  <path
                    d={`M ${anchor.x + ox} ${anchor.y + oy} L ${elbowX} ${anchor.y + oy} L ${endX} ${labelY}`}
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinejoin="round"
                  />
                  <circle cx={anchor.x + ox} cy={anchor.y + oy} r="2.5" fill="#6B7280" />
                  <text
                    x={labelX}
                    y={labelY - 12}
                    textAnchor={textAnchor}
                    className="fill-foreground text-[13px] font-bold"
                  >
                    {slice.percentage.toFixed(0)}% {title}
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 6}
                    textAnchor={textAnchor}
                    className="fill-muted-foreground text-[10px]"
                  >
                    {slice.value} en total
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
