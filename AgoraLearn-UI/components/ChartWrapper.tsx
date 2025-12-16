"use client";

"use client";

import React from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Series = { name?: string; points: Array<{ x: string | number; y: number }> };

export default function ChartWrapper({ chart }: { chart: any }) {
  if (!chart) return <div>No chart data</div>;

  if (chart && typeof chart === 'object' && chart.message) {
    return (
      <div style={{ maxWidth: 820, padding: 12, background: '#fff', borderRadius: 8, color: '#111' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Chart unavailable</div>
        <div style={{ marginBottom: 8 }}>{String(chart.message)}</div>
        <details style={{ fontSize: 12, color: '#444' }}>
          <summary>Debug payload</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(chart, null, 2)}</pre>
        </details>
      </div>
    );
  }

  try { console.log('[AgoraLearn] ChartWrapper chart prop:', chart); } catch {}

  const chartType = (chart.chartType || chart.type || 'line').toLowerCase();
  const xLabel = chart.xAxisLabel || chart.x_label || '';
  const yLabel = chart.yAxisLabel || chart.y_label || '';
  let series: Series[] = [];
  if (Array.isArray(chart.series)) series = chart.series;
  else if (Array.isArray(chart.seriesData)) series = chart.seriesData;
  else if (chart.data && Array.isArray(chart.data.series)) series = chart.data.series;
  const table = Array.isArray(chart.columns) && Array.isArray(chart.rows) ? { columns: chart.columns, rows: chart.rows } : (chart.data && Array.isArray(chart.data.columns) && Array.isArray(chart.data.rows) ? { columns: chart.data.columns, rows: chart.data.rows } : null);
  if (table) {
    const cols: string[] = table.columns.map((c: any) => String(c));
    const xCol = 0;
    const numericCols = cols.slice(1).map((c, idx) => ({ name: c, index: idx + 1 }));
    series = numericCols.map((nc) => ({ name: nc.name, points: table.rows.map((r: any) => ({ x: r[xCol], y: Number(r[nc.index]) })) }));
  }

  const labels = series.length > 0 ? series[0].points.map((p) => String(p.x)) : [];
  const datasets = series.map((s, i) => {
    const data = s.points.map((p) => {
      const n = typeof p.y === 'number' ? p.y : (p.y == null ? NaN : Number(p.y));
      return Number.isFinite(n) ? n : NaN;
    });
    return {
      label: s.name || `series ${i + 1}`,
      data,
      borderColor: `hsl(${(i * 60) % 360} 70% 50%)`,
      backgroundColor: `hsl(${(i * 60) % 360} 70% 60% / 0.6)`,
      spanGaps: true,
    };
  });

  const commonOpts: any = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { x: { title: { display: !!xLabel, text: xLabel } }, y: { title: { display: !!yLabel, text: yLabel } } },
  };

  try { console.log('[AgoraLearn] ChartWrapper labels:', labels, 'datasets length:', datasets.length); } catch {}

  return (
    <div style={{ width: '100%', maxWidth: 820 }}>
      {chartType === 'bar' ? (
        <Bar data={{ labels, datasets }} options={commonOpts} />
      ) : chartType === 'pie' || chartType === 'doughnut' ? (
        <Pie data={{ labels, datasets }} options={commonOpts} />
      ) : (
        <Line data={{ labels, datasets }} options={commonOpts} />
      )}
      {chart.insights && <div style={{ marginTop: 8, fontSize: 13 }}>{chart.insights}</div>}
    </div>
  );
}
