import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { chart, palette } from '@/styles/palette'

// Teacher charts. One series each, so one colour and no legend box (the card
// title names what's plotted). Thin marks, solid hairline grid, values on the
// marks, a hover tooltip, and a table view under every chart, since
// ember-500 and sky-500 are under 3:1 on white and colour can't carry it alone.

const TICK = { fill: chart.axisText, fontSize: 12 }

// ---- ChartCard ----
// `empty` is a sentence shown instead of the chart when there's no data yet.
export function ChartCard({ title, subtitle, empty, table, children }) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5 md:p-5"
    >
      <h2 id={headingId} className="text-lg">
        {title}
      </h2>
      {subtitle && <p className="text-sm">{subtitle}</p>}

      {empty ? (
        <div className="mt-4 flex min-h-[200px] flex-col items-center justify-center rounded-xl bg-ink-900/[0.03] px-4 text-center">
          <BarChart3 aria-hidden="true" className="h-8 w-8 text-ink-600/50" />
          <p className="mt-2 font-semibold text-ink-900">{empty}</p>
        </div>
      ) : (
        <>
          <div className="mt-4">{children}</div>
          {table && (
            <details className="mt-2 text-sm">
              <summary className="inline-flex min-h-tap cursor-pointer items-center font-semibold text-ink-600 hover:text-ink-900">
                Show as table
              </summary>
              <table className="mt-1 w-full text-left">
                <thead>
                  <tr className="border-b border-ink-900/10">
                    {table.columns.map((c) => (
                      <th key={c} scope="col" className="py-1.5 pr-3 font-semibold text-ink-900">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {table.rows.map((row) => (
                    <tr key={row[0]} className="border-b border-ink-900/5">
                      {row.map((cell, i) => (
                        <td key={i} className="py-1.5 pr-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </section>
  )
}

// ---- tooltip ----
// Value first and strong, label second: the reader already knows the series.
function ChartTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-lift ring-1 ring-ink-900/10">
      <p className="font-heading text-base font-bold text-ink-900">{formatValue(point)}</p>
      <p className="text-ink-600">{point.title ?? point.label}</p>
    </div>
  )
}

// ---- ChapterScoreChart ----
// data: [{ label: 'Ch 1', title, value: 0-100 | null }]. A null value (no one
// has taken that quiz) draws no bar and says "Not yet" instead of 0%.
export function ChapterScoreChart({ data }) {
  const plotted = data.map((d) => ({
    ...d,
    plot: d.value ?? 0,
    display: d.value === null ? 'Not yet' : `${d.value}%`,
  }))

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={plotted} margin={{ top: 22, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: chart.grid }} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: chart.hover }}
            content={<ChartTooltip formatValue={(p) => p.display} />}
          />
          <Bar
            dataKey="plot"
            fill={chart.bar}
            activeBar={{ fill: palette.ember[700] }}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="display"
              position="top"
              offset={6}
              style={{ fill: palette.ink[900], fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---- DailyLessonsChart ----
// data: [{ date, label: '24 Sep', value }], oldest first. The last point gets
// a dot and its number; everything else is in the tooltip and table.
export function DailyLessonsChart({ data }) {
  const last = data.length - 1

  // Recharts hands an area's dot `value` as [baseline, value], so the number
  // comes from the data point itself. The key stops React's list warning.
  function EndDot({ cx, cy, index, payload }) {
    if (index !== last) return <g key={`dot-${index}`} />
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={5} fill={chart.line} stroke={chart.surface} strokeWidth={2} />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="end"
          fill={palette.ink[900]}
          fontSize={12}
          fontWeight={600}
          // A white halo keeps the label readable where the line runs under it
          stroke={chart.surface}
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {payload.value} today
        </text>
      </g>
    )
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis
            dataKey="label"
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: chart.grid, strokeWidth: 1 }}
            content={
              <ChartTooltip
                formatValue={(p) => `${p.value} ${p.value === 1 ? 'lesson' : 'lessons'}`}
              />
            }
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={chart.line}
            strokeWidth={2}
            fill={chart.lineWash}
            dot={EndDot}
            activeDot={{ r: 5, fill: chart.line, stroke: chart.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
