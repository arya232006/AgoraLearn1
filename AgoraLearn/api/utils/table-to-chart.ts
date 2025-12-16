type Table = { title?: string; headers: string[]; rows: Array<Array<any>> };

function isNumeric(v: any) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return !isNaN(v);
  const s = String(v).replace(/,/g, '').trim();
  if (s === '') return false;
  return !isNaN(Number(s));
}

export function tableToChart(table: Table) {
  // Build column arrays
  const headers = table.headers || [];
  const cols: any[][] = headers.map((_, i) => table.rows.map((r) => r[i]));

  // Determine numeric columns
  const numericScores = cols.map((col) => {
    const num = col.filter((v) => isNumeric(v)).length;
    return num / Math.max(1, col.length);
  });

  // Choose x column as the first column with low numeric score (< 0.5)
  let xIndex = numericScores.findIndex((s) => s < 0.5);
  if (xIndex === -1) xIndex = 0; // fallback to first

  // y columns are those with numericScore >= 0.5 and not the x column
  const yIndices = numericScores
    .map((s, i) => ({ s, i }))
    .filter((o) => o.i !== xIndex && o.s >= 0.5)
    .map((o) => o.i);

  // If no numeric columns found, try coercing by parsing values
  if (yIndices.length === 0) {
    for (let i = 0; i < cols.length; i++) {
      if (i === xIndex) continue;
      const coercedNum = cols[i].filter((v) => isNumeric(v)).length;
      if (coercedNum > 0) yIndices.push(i);
    }
  }

  // Build series
  const series = yIndices.map((yi) => ({ name: headers[yi] || `series ${yi}`, points: table.rows.map((r) => ({ x: r[xIndex], y: Number(String(r[yi]).replace(/,/g, '')) || 0 })) }));

  // Prefer a line chart for numeric series (more conventional for trends).
  // Previously we used a bar chart when there was only a single series.
  // Use 'line' by default; callers can still override if they want bars.
  const chartType = 'line';

  return {
    chartType,
    xAxisLabel: headers[xIndex] || '',
    yAxisLabel: series.length === 1 ? headers[yIndices[0]] || '' : '',
    series,
  };
}
