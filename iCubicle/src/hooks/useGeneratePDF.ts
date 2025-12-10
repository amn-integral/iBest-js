/**
 * Hook for generating PDF reports from cubicle analysis results.
 * Renders charts to base64, creates HTML report, and exports to PDF.
 */

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { CubicleResponse, CubicleInputType, CubicleCalculatedParams, GRFPipelineCurve } from '../api/types';
import { renderChartToBase64 } from '../utils/renderChartToBase64';

interface GeneratePDFOptions {
  filename?: string;
}

interface GeneratePDFResult {
  generatePDF: (response: CubicleResponse, options?: GeneratePDFOptions) => Promise<void>;
  isGenerating: boolean;
  progress: number;
  error: string | null;
}

export function useGeneratePDF(): GeneratePDFResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async (response: CubicleResponse, options: GeneratePDFOptions = {}): Promise<void> => {
    const { filename = 'cubicle_analysis_report.pdf' } = options;

    try {
      setIsGenerating(true);
      setProgress(0);
      setError(null);

      // Validate response data
      if (!response.success || !response.result || !response.pressure_steps) {
        throw new Error('Invalid response data for PDF generation');
      }

      const { result, pressure_steps, calculated_params, input_params } = response;

      if (!calculated_params || !input_params) {
        throw new Error('Missing calculated_params or input_params in response');
      }

      console.log('Pressure steps keys:', Object.keys(pressure_steps));
      console.log('Pressure steps data:', pressure_steps);

      // Step 1: Render all charts to base64 (Steps 1-4)
      setProgress(10);
      const pressureChartImages: Record<number, string[]> = {};

      for (let stepNum = 1; stepNum <= 4; stepNum++) {
        // Backend returns steps 2-9, we map them to display steps 1-4
        // Step 1 display = backend steps 2-3 (original + interpolated)
        // Step 2 display = backend steps 4-5 (original + interpolated)
        // Step 3 display = backend steps 6-7 (original + interpolated)
        // Step 4 display = backend steps 8-9 (original + interpolated)
        const backendStepOriginal = stepNum * 2;
        const backendStepInterpolated = stepNum * 2 + 1;

        const originalCurves = pressure_steps[backendStepOriginal] || [];
        const interpolatedCurves = pressure_steps[backendStepInterpolated] || [];

        console.log(`Step ${stepNum}: ${originalCurves.length} original curves, ${interpolatedCurves.length} interpolated curves`);

        // Combine curves by matching filters (same logic as backend _render_and_combine_graphs)
        const combinedCurves = combineChartsByFilters(originalCurves, interpolatedCurves);

        console.log(`Step ${stepNum}: Combined into ${combinedCurves.length} charts`);

        // Render each combined chart to base64
        const chartPromises = combinedCurves.map(curve => renderChartToBase64(curve, { width: 400, height: 300 }));
        const chartImages = await Promise.all(chartPromises);

        pressureChartImages[stepNum] = chartImages;
        console.log(`Step ${stepNum}: Generated ${chartImages.length} images`);

        // Update progress: 10% to 60% for chart rendering
        setProgress(10 + (stepNum / 4) * 50);
      }

      // Step 2: Generate HTML sections for section-by-section rendering
      setProgress(65);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - 2 * margin;

      let currentY = margin;

      // Helper to render HTML section to PDF
      const renderSection = async (htmlContent: string, maxWidth: number = 816): Promise<void> => {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = `${maxWidth}px`;
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.boxSizing = 'border-box';
        container.innerHTML = htmlContent;

        const styleElement = document.createElement('style');
        styleElement.textContent = getReportStyles();
        container.prepend(styleElement);

        document.body.appendChild(container);
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowHeight: container.scrollHeight,
          height: container.scrollHeight
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Check if we need a new page (with some margin buffer)
        if (currentY + imgHeight > pdfHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5; // Add 5mm spacing
      };

      // Step 3: Render header section
      setProgress(70);
      const headerHTML = generateHeaderHTML();
      await renderSection(headerHTML);

      // Step 4: Render summary table
      const summaryHTML = generateSummaryTableHTML(result.Params as unknown as Record<string, number>);
      await renderSection(summaryHTML);

      // Step 5: Render input parameters table
      const inputParamsHTML = generateInputParamsHTML(input_params, calculated_params);
      await renderSection(inputParamsHTML);

      // Step 6: Render pressure step charts (1-4)
      for (let stepNum = 1; stepNum <= 4; stepNum++) {
        const stepCharts = pressureChartImages[stepNum] || [];
        
        // Add step header
        const stepHeaderHTML = `<h2 style="margin: 20px 0 10px 0; font-size: 18px; color: #2c3e50;">Shock Pressure Analysis - Step ${stepNum}</h2>`;
        await renderSection(stepHeaderHTML);

        // Render charts directly to PDF (not through HTML to avoid base64 URL issues)
        for (let i = 0; i < stepCharts.length; i += 2) {
          const chart1 = stepCharts[i];
          const chart2 = stepCharts[i + 1];

          // Chart dimensions in mm (400x300 pixels ≈ 85x64mm at 120 DPI)
          const chartWidth = 85;
          const chartHeight = 64;
          const chartGap = 5;
          const rowHeight = chartHeight + 5;

          // Check if we need a new page
          if (currentY + rowHeight > pdfHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }

          // Calculate centered position for charts
          const totalWidth = chart2 ? chartWidth * 2 + chartGap : chartWidth;
          const startX = margin + (contentWidth - totalWidth) / 2;

          // Add first chart
          pdf.addImage(chart1, 'PNG', startX, currentY, chartWidth, chartHeight);

          // Add second chart if exists
          if (chart2) {
            pdf.addImage(chart2, 'PNG', startX + chartWidth + chartGap, currentY, chartWidth, chartHeight);
          }

          currentY += rowHeight;
        }

        setProgress(70 + (stepNum / 4) * 25);
      }

      // Step 7: Download PDF
      setProgress(95);
      pdf.save(filename);

      setProgress(100);
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsGenerating(false);
      setProgress(0);
      console.error('PDF generation failed:', err);
    }
  };

  return {
    generatePDF,
    isGenerating,
    progress,
    error
  };
}

/**
 * Generate header HTML section
 */
function generateHeaderHTML(): string {
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #2c3e50; font-size: 24px; margin: 0 0 10px 0; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
        UFC 3-340-02 Cubicle Analysis Report
      </h1>
    </div>
  `;
}

/**
 * Generate summary table HTML
 */
function generateSummaryTableHTML(results: Record<string, number>): string {
  return `
    <div style="margin: 20px 0;">
      <h2 style="color: #34495e; font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #bdc3c7; padding-bottom: 5px;">
        Analysis Summary
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #3498db; color: white;">
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Value</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Units</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Shock Pressure (Ps)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Ps?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">psi</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Shock Impulse (Is)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Is?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">psi-ms</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Shock Duration (Ts)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Ts?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ms</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Gas Pressure (Pg)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Pg?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">psi</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Gas Impulse (Ig)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Ig?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">psi-ms</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;"><strong>Gas Duration (Tg)</strong></td><td style="border: 1px solid #bdc3c7; padding: 8px;">${results.Tg?.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ms</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate input parameters HTML
 */
function generateInputParamsHTML(inputParams: CubicleInputType, calculatedParams: CubicleCalculatedParams): string {
  return `
    <div style="margin: 20px 0;">
      <h2 style="color: #34495e; font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #bdc3c7; padding-bottom: 5px;">
        Input Parameters
      </h2>
      
      <h3 style="color: #7f8c8d; font-size: 14px; margin: 15px 0 8px 0;">Charge & Geometry</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #3498db; color: white;">
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Charge Weight (W)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.W.toFixed(2)} lbs</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Cubicle Type</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.cubicle_type}</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Target Wall</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.target_wall}</td></tr>
        </tbody>
      </table>
      
      <h3 style="color: #7f8c8d; font-size: 14px; margin: 15px 0 8px 0;">Cubicle Dimensions</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #3498db; color: white;">
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Value</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Units</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Length (Lc)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.Lc.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Width (Wc)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.Wc.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Height (Hc)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.Hc.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">X Position</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.X.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Y Position</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.Y.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Z Position</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${inputParams.Z.toFixed(2)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">ft</td></tr>
        </tbody>
      </table>
      
      <h3 style="color: #7f8c8d; font-size: 14px; margin: 15px 0 8px 0;">Calculated Geometry Parameters</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #3498db; color: white;">
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Value</th>
            <th style="border: 1px solid #bdc3c7; padding: 8px; text-align: left;">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Standoff Distance (Ra)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.Ra.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Distance from charge to target wall</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Reflections (N)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.N.toFixed(1)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Number of shock reflections</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Height Ratio (h/H)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.h_over_H.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Target height to enclosure height</td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Length Ratio (l/L)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.l_over_L.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Target length to enclosure length</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Scaled Standoff (Za)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.Ra_over_W_cube_root.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Ra/W<sup>1/3</sup></td></tr>
          <tr style="background-color: #ecf0f1;"><td style="border: 1px solid #bdc3c7; padding: 8px;">Aspect Ratio (L/Ra)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.L_over_Ra.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Enclosure length to standoff</td></tr>
          <tr><td style="border: 1px solid #bdc3c7; padding: 8px;">Chamber Ratio (L/H)</td><td style="border: 1px solid #bdc3c7; padding: 8px;">${calculatedParams.L_over_H.toFixed(3)}</td><td style="border: 1px solid #bdc3c7; padding: 8px;">Enclosure length to height</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Get CSS styles for the report
 */
function getReportStyles(): string {
  return `
    .report {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    
    .report h1 {
      color: #2c3e50;
      font-size: 16pt;
      margin-bottom: 10pt;
      border-bottom: 3px solid #3498db;
      padding-bottom: 5pt;
    }
    
    .report h2 {
      color: #34495e;
      font-size: 14pt;
      margin-top: 20pt;
      margin-bottom: 10pt;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 3pt;
    }
    
    .report h3 {
      color: #7f8c8d;
      font-size: 13pt;
      margin-top: 15pt;
      margin-bottom: 8pt;
    }
    
    .report section {
      margin-bottom: 20pt;
    }
    
    .report table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 10pt;
    }
    
    .report th, .report td {
      border: 1px solid #bdc3c7;
      padding: 6pt;
      text-align: left;
    }
    
    .report th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .report tr:nth-child(even) {
      background-color: #ecf0f1;
    }
    
    .report p {
      margin: 8pt 0;
      font-size: 10pt;
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10pt;
      margin: 10pt 0;
    }
    
    .chart-item {
      text-align: center;
      max-width: 100%;
      overflow: hidden;
    }
    
    .chart-item img {
      width: 100%;
      height: auto;
      max-width: 350px;
      display: block;
      margin: 0 auto;
    }
    
    .footer {
      margin-top: 30pt;
      padding-top: 10pt;
      border-top: 1px solid #bdc3c7;
      font-size: 9pt;
      color: #7f8c8d;
      text-align: center;
    }
  `;
}

/**
 * Combine charts by matching filters - replicates backend _render_and_combine_graphs logic.
 * Takes original curves and interpolated curves, matches them by filters field,
 * and appends interpolated curve data to the original curves.
 *
 * @param originalCurves - Original GRF curves
 * @param interpolatedCurves - Interpolated GRF curves to merge
 * @returns Array of combined GRF curves
 */
function combineChartsByFilters(
  originalCurves: GRFPipelineCurve[],
  interpolatedCurves: GRFPipelineCurve[]
): GRFPipelineCurve[] {
  if (!interpolatedCurves || interpolatedCurves.length === 0) {
    return originalCurves;
  }

  // Create deep copies to avoid mutating original data
  const combined = originalCurves.map(original => ({
    ...original,
    curves: [...original.curves]
  }));

  // Match interpolated curves to original curves by filters
  for (let i = 0; i < combined.length; i++) {
    for (const interpolated of interpolatedCurves) {
      // Check if filters match
      const filtersMatch = areFiltersEqual(combined[i].filters, interpolated.filters);

      if (filtersMatch && interpolated.curves.length > 0) {
        // Append the first curve from interpolated to the original's curves array
        combined[i].curves.push(interpolated.curves[0]);
        break;
      }
    }
  }

  return combined;
}

/**
 * Compare two filter objects for equality
 */
function areFiltersEqual(filters1?: Record<string, number>, filters2?: Record<string, number>): boolean {
  if (!filters1 && !filters2) return true;
  if (!filters1 || !filters2) return false;

  const keys1 = Object.keys(filters1);
  const keys2 = Object.keys(filters2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => filters1[key] === filters2[key]);
}
