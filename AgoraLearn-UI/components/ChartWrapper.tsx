"use client";

import React, { useState, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

/* 
   Error Bars Plugin
   Draws error bars if data points have 'error' or 'yError' property.
*/
const errorBarsPlugin = {
  id: 'errorBars',
  afterDatasetsDraw: (chart: any) => {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;
      
      meta.data.forEach((element: any, index: number) => {
        const datum = dataset.data[index];
        // Check for error property
        const error = datum?.error ?? datum?.yError;
        if (!error) return;

        const { x, y } = element.getProps(['x', 'y'], true);
        const yScale = chart.scales.y;
        
        // Value might be in raw data (datum.y) or implied
        const yVal = datum.y !== undefined ? datum.y : datum;
        
        const yHigh = yScale.getPixelForValue(yVal + error);
        const yLow = yScale.getPixelForValue(yVal - error);

        ctx.save();
        ctx.strokeStyle = dataset.borderColor || 'rgba(255,255,255,0.8)';
        ctx.fillStyle = dataset.borderColor || 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, yLow);
        ctx.lineTo(x, yHigh);
        ctx.stroke();
        
        // Caps
        ctx.beginPath();
        ctx.moveTo(x - 4, yLow);
        ctx.lineTo(x + 4, yLow);
        ctx.moveTo(x - 4, yHigh);
        ctx.lineTo(x + 4, yHigh);
        ctx.stroke();
        
        ctx.restore();
      });
    });
  }
};

const graphPaperPlugin = {
  id: 'graphPaperPlugin',
  beforeDraw: (chart: any, args: any, options: any) => {
    if (!options.mode || options.mode === 'standard') return;
    
    // Safety check for chart area
    if (!chart.chartArea) return;

    const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
    const isMM = options.mode === 'mm';
    
    ctx.save();
    ctx.beginPath();
    

    // Helper to draw grid
    // Replacement: Uniform Grid (Simulated Physical Graph Paper)
    // Enforces square cells (~4px = true 1mm at 96dpi) regardless of data axis scaling.
    const drawUniformGrid = (axis: any, isX: boolean) => {
        // Standard Screen DPI is 96. 1 inch = 25.4mm.
        // 96 px / 25.4 mm ~= 3.78 px/mm.
        // We use ~3.8 px to approximate "True 1mm" size on standard screens.
        const TARGET_PX = 3.8; 
        
        // Boundaries
        const startBound = isX ? left : top;
        const endBound = isX ? right : bottom;

        // Anchor grid to the axis origin (0) or the first data point.
        // This ensures the "paper" moves with the data.
        let anchorPx = axis.getPixelForValue(0);

        // Fallback: If 0 is not valid (e.g. strict Category axis without implicit indices, or data range far from 0),
        // we must find ANY fixed point in the data to anchor to.
        if (!Number.isFinite(anchorPx)) {
             // Strategy 1: Try anchoring to the first label (Category Axis)
             const data = chart.data;
             if (isX && data && data.labels && data.labels.length > 0) {
                 // For category axis, passing the label string or index 0 usually works
                 // Try index 0 first explicitly if getPixelForValue(0) failed above (rare)
                 // Then try label string
                 const firstLabel = data.labels[0];
                 const px = axis.getPixelForValue(firstLabel);
                 if (Number.isFinite(px)) anchorPx = px;
             }
             
             // Strategy 2: Try anchoring to the first actual data point value (Linear Axis / Scatter)
             if (!Number.isFinite(anchorPx) && data && data.datasets && data.datasets.length > 0) {
                 const dataset = data.datasets[0];
                 if (dataset.data && dataset.data.length > 0) {
                     const p = dataset.data[0];
                     let val = null;
                     
                     // Handle {x,y} objects or raw numbers
                     if (typeof p === 'object' && p !== null) {
                         val = isX ? p.x : p.y;
                     } else if (typeof p === 'number') {
                         val = p; // For Y axis usually, or X if labels missing
                     }

                     if (val !== null) {
                         // Verify val is valid for this axis (e.g. not a string for Linear scale)
                         const px = axis.getPixelForValue(val);
                         if (Number.isFinite(px)) anchorPx = px;
                     }
                 }
             }

             // Strategy 3: Chart.js Internal - getPixelForTick (Index)
             // Ticks are generated based on view, but Scale.ticks usually contain all ticks? 
             // No, usually only visible. This was the source of the "Jumping" bug.
             // We skip this to avoid jumps.
        }

        // Final Fallback: Static anchor (Grid won't move, but won't crash)
        if (!Number.isFinite(anchorPx)) {
            anchorPx = isX ? left : top;
        }

        // Calculate range of steps (k) relative to anchor
        const minK = Math.ceil((startBound - anchorPx) / TARGET_PX);
        const maxK = Math.floor((endBound - anchorPx) / TARGET_PX);
        
        // Grid Colors (Standard Blue Paper)
        // Major (1cm) - Strong Blue
        // Mid (0.5cm) - Med Blue
        // Minor (1mm) - Light Blue
        const colorMajor = 'rgba(65, 105, 225, 0.5)'; // RoyalBlue
        const colorMid   = 'rgba(65, 105, 225, 0.3)';
        const colorMinor = 'rgba(65, 105, 225, 0.1)';

        for (let k = minK; k <= maxK; k++) {
            const pos = anchorPx + (k * TARGET_PX);
            
            // Avoid drawing outside chart area (float precision)
            if (isX) {
                if (pos < left - 0.1 || pos > right + 0.1) continue;
            } else {
                if (pos < top - 0.1 || pos > bottom + 0.1) continue;
            }

            // Hierarchy: 
            // 0, 10, 20... -> Major (1cm)
            // 5, 15, 25... -> Mid (0.5cm)
            // Others -> Minor (1mm)
            const isMajor = (k % 10 === 0);
            const isMid = (k % 5 === 0) && !isMajor;

            ctx.lineWidth = isMajor ? 1.0 : (isMid ? 0.6 : 0.4);
            ctx.strokeStyle = isMajor ? colorMajor : (isMid ? colorMid : colorMinor);

            ctx.beginPath(); 
            if (isX) {
                ctx.moveTo(pos, top);
                ctx.lineTo(pos, bottom);
            } else {
                ctx.moveTo(left, pos);
                ctx.lineTo(right, pos);
            }
            ctx.stroke();
        }
    };

    if (x) drawUniformGrid(x, true);
    if (y) drawUniformGrid(y, false);


    ctx.restore();
  }
};

type Series = { name?: string; points: Array<{ x: string | number; y: number }> };

export default function ChartWrapper({ chart }: { chart: any }) {
  const chartRef = useRef<any>(null);
  const [gridMode, setGridMode] = useState<'standard' | 'mm'>('standard');

  // Dynamically register zoom plugin on client-side only to fix "window is not defined" during build
  React.useEffect(() => {
    import('chartjs-plugin-zoom').then((plugin) => {
      ChartJS.register(plugin.default);
    });
  }, []);

  const handleResetZoom = () => {
      if (chartRef.current) {
          chartRef.current.resetZoom();
      }
  };

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

  // Helper to generate Chart.js scale configuration based on mode
  const getScaleOptions = (axisType: 'x' | 'y', originalScale: any) => {
    if (gridMode === 'standard') {
      return {
          ...originalScale,
          grid: {
              ...(originalScale?.grid || {}),
              color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
             ...(originalScale?.ticks || {}),
             color: '#9CA3AF',
          }
      };
    }

    // Graph Paper Logic
    const isMM = gridMode === 'mm';
    
    // In "Science Graph" mode, we want a graph paper look.
    return {
      ...originalScale,
      grid: {
        ...(originalScale?.grid || {}),
        display: true,
        drawOnChartArea: true,
        drawTicks: true,
        // We let Plugin handle the grid lines (Major & Minor) for MM mode to ensure perfect 1/10th rhythm.
        // For Standard, we rely on Chart.js.
        color: (context: any) => {
             // Hide native grid lines in MM mode (plugin draws them)
             if (isMM) return 'transparent'; 
             
             return 'rgba(255, 255, 255, 0.1)';
        },
        // Fix "Why are they so long": Reduce tick length
        tickLength: isMM ? 4 : 8, 
        lineWidth: 1,
      },
      ticks: {
          ...(originalScale?.ticks || {}),
          color: '#333', 
          font: { weight: 'bold' }
      }, 
      title: {
          ...(originalScale?.title || {}),
          color: '#111',
          font: { weight: 'bold' }
      },
      border: {
          display: true,
          color: isMM ? 'rgba(70, 130, 240, 0.8)' : '#333',
          width: 2
      }
    };
  };

  const ModeToggle = () => (
     <div className="flex bg-gray-800 rounded-md p-0.5 shrink-0 ml-auto z-10 relative gap-2">
        <button 
          onClick={handleResetZoom}
          className="px-3 py-1 text-xs font-medium rounded text-gray-400 hover:text-white border border-gray-600"
          title="Reset Zoom"
        >Reset View</button>
        <div className="flex bg-gray-800 rounded-md">
            <button 
            onClick={() => setGridMode('standard')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${gridMode === 'standard' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >Standard</button>
            <button 
            onClick={() => setGridMode('mm')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${gridMode === 'mm' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >MM</button>
        </div>
     </div>
  );

  const containerStyle: React.CSSProperties = {
    maxWidth: 820, 
    padding: 12, 
    borderRadius: 8, 
    // In Standard mode: Transparent bg + no border
    // In Graph modes: White bg + border
    // REMOVED: CSS gradients that caused misalignment (Moiré patterns)
    backgroundColor: gridMode === 'standard' ? 'transparent' : 'white', 
    border: gridMode === 'standard' ? 'none' : '1px solid #999',
  };

  if (chart.data && chart.data.datasets) {
    const data = chart.data;
    const baseOptions = chart.options || {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: !!chart.title, text: chart.title || '' },
      }
    };
    

    const options = {
        ...baseOptions,
        plugins: {
            ...baseOptions.plugins,
            graphPaperPlugin: { // Config for our custom plugin
                mode: gridMode
            },
            legend: {
                ...baseOptions.plugins?.legend,
                labels: { color: gridMode === 'standard' ? '#ccc' : '#333' }
            },
            title: {
                ...baseOptions.plugins?.title,
                color: gridMode === 'standard' ? '#ccc' : '#333'
            },
            zoom: {
              pan: { enabled: true, mode: 'xy' },
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
            }
        },
        scales: {
            x: getScaleOptions('x', baseOptions.scales?.x),
            y: getScaleOptions('y', baseOptions.scales?.y)
        }
    };

    return (
      <div style={{ ...containerStyle, background: gridMode === 'standard' ? '#1f2937' : containerStyle.backgroundColor }}> 
         <div className="flex justify-between items-center mb-4">
            {chart.insights && <div style={{color: gridMode !== 'standard' ? '#333' : '#eee', fontSize:'0.9rem', fontStyle:'italic', marginRight: 10}}>💡 {chart.insights}</div>}
            <ModeToggle />
         </div>
         <div style={{ position: 'relative', height: '400px', width: '100%', cursor: 'move' }}>
            {chartType === 'line' ? <Line ref={chartRef} data={data} options={options} plugins={[graphPaperPlugin, errorBarsPlugin]} /> :
            chartType === 'bar' ? <Bar ref={chartRef} data={data} options={options} plugins={[graphPaperPlugin, errorBarsPlugin]} /> :
            chartType === 'pie' ? <Pie ref={chartRef} data={data} options={options} plugins={[graphPaperPlugin]} /> :
            <Line ref={chartRef} data={data} options={options} plugins={[graphPaperPlugin, errorBarsPlugin]} />}
         </div>
      </div>
    );
  }

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
      let y = typeof p.y === 'number' ? p.y : (p.y == null ? NaN : Number(p.y));
      y = Number.isFinite(y) ? y : NaN;
      // If error data exists, return object structure
      if (p.error !== undefined || p.yError !== undefined) {
         return { x: p.x, y, error: Number(p.error || p.yError) };
      }
      return y;
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
    maintainAspectRatio: false,
    plugins: { 
        graphPaperPlugin: { mode: gridMode },
        legend: { position: 'top', labels: { color: gridMode === 'standard' ? '#ccc' : '#333' } },
        title: { color: gridMode === 'standard' ? '#ccc' : '#333' },
        zoom: {
          pan: { enabled: true, mode: 'xy' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
    },
    scales: { 
        x: getScaleOptions('x', { title: { display: !!xLabel, text: xLabel } }), 
        y: getScaleOptions('y', { title: { display: !!yLabel, text: yLabel }, ticks: { autoSkip: true, maxTicksLimit: 20 } }) 
    },
  };

  try { console.log('[AgoraLearn] ChartWrapper labels:', labels, 'datasets length:', datasets.length); } catch {}

  return (
    <div style={containerStyle}>
      <div className="flex justify-end mb-2">
           <ModeToggle />
      </div>
      <div style={{ position: 'relative', height: '100%', minHeight: '400px', cursor: 'move' }}>
      {chartType === 'bar' ? (
        <Bar ref={chartRef} data={{ labels, datasets }} options={commonOpts} plugins={[graphPaperPlugin, errorBarsPlugin]} />
      ) : chartType === 'pie' || chartType === 'doughnut' ? (
        <Pie ref={chartRef} data={{ labels, datasets }} options={commonOpts} plugins={[graphPaperPlugin]} />
      ) : (
        <Line ref={chartRef} data={{ labels, datasets }} options={commonOpts} plugins={[graphPaperPlugin, errorBarsPlugin]} />
      )}
      </div>
      {chart.insights && <div style={{ marginTop: 8, fontSize: 13, color: gridMode === 'standard' ? '#eee' : '#333' }}>{chart.insights}</div>}
    </div>
  );
}
