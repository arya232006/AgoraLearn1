import { callTextModel } from '../lib/llm-client';

type Table = { title?: string; headers: string[]; rows: Array<Array<any>> };

function isNumeric(v: any) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return !isNaN(v);
  const s = String(v).replace(/,/g, '').trim();
  if (s === '') return false;
  return !isNaN(Number(s));
}

function tableToChartHeuristic(table: Table) {
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

export async function tableToChart(table: Table) {
  try {
    // Use LLM to determine chart configuration (columns and type)
    const prompt = `You are a data visualization expert.
Analyze this table to create the most meaningful chart.
Headers: ${JSON.stringify(table.headers)}
First 3 rows: ${JSON.stringify(table.rows.slice(0, 3))}

Identify:
1. The best chart type (line, bar, pie, scatter, area).
2. The column to use for the X-axis (categories/time).
3. The column(s) to use for the Y-axis (numeric values).

Return ONLY JSON:
{
  "chartType": "line" | "bar" | "pie" | "scatter" | "area",
  "xColumn": "exact_header_name",
  "yColumns": ["exact_header_name_1", ...]
}`;

    const response = await callTextModel({ prompt, maxTokens: 300 });
    const text = response.text.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const config = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      
      const xIndex = table.headers.indexOf(config.xColumn);
      const yIndices = config.yColumns.map((col: string) => table.headers.indexOf(col)).filter((i: number) => i >= 0);

      if (xIndex >= 0 && yIndices.length > 0) {
        const series = yIndices.map((yi: number) => ({
          name: table.headers[yi],
          points: table.rows.map((r) => ({
            x: r[xIndex],
            y: Number(String(r[yi]).replace(/,/g, '')) || 0
          }))
        }));

        return {
          chartType: config.chartType,
          xAxisLabel: config.xColumn,
          yAxisLabel: yIndices.length === 1 ? table.headers[yIndices[0]] : '',
          series
        };
      }
    }
  } catch (e) {
    console.warn('LLM chart config failed, using heuristic:', e);
  }

  return tableToChartHeuristic(table);
}
