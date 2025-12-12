/**
 * Hook for generating PDF reports from cubicle analysis results.
 * Renders charts to base64, creates HTML report, and exports to PDF.
 */

import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { CubicleResponse, GRFPipelineCurve } from '../api/types';
import { renderChartToBase64 } from '../utils/renderChartToBase64';
import {
  PDFHeader,
  PDFSummaryTable,
  PDFStepHeader,
  TableChargeGeometry,
  TableCubicleDimensions,
  TableCalculatedProps,
  SectionHeader,
  Paragraph
} from '../components/PDFComponents';

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
      if (!response.success || !response.result) {
        throw new Error('Invalid response data for PDF generation');
      }

      const { CalculatedParams, ShockPressureSteps, GasPressureSteps, ShockImpulseSteps, GasImpulseSteps, FinalChart, InputParams } = response.result;

      if (!CalculatedParams || !InputParams) {
        throw new Error('Missing CalculatedParams or InputParams in response');
      }

      setProgress(10);

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
        container.style.backgroundColor = 'white';
        container.style.boxSizing = 'border-box';
        container.innerHTML = htmlContent;

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

      setProgress(70);
      const headerHTML = renderToStaticMarkup(<PDFHeader />);
      await renderSection(headerHTML);

      const summaryHTML = renderToStaticMarkup(<PDFSummaryTable results={CalculatedParams as unknown as Record<string, number>} />);
      await renderSection(summaryHTML);

      const inputParamsHTML = renderToStaticMarkup(<TableChargeGeometry {...InputParams} />);
      await renderSection(inputParamsHTML);

      const cubicleDimensionsHTML = renderToStaticMarkup(<TableCubicleDimensions {...InputParams} />);
      await renderSection(cubicleDimensionsHTML);

      const calculatedParamsHTML = renderToStaticMarkup(<TableCalculatedProps {...CalculatedParams} />);
      await renderSection(calculatedParamsHTML);

      pdf.addPage();
      currentY = margin;
      await renderSection(renderToStaticMarkup(<SectionHeader {...{ title: 'Shock Pressure Step Calculations' }} />));

      // Step 1 for pressure charts
      const step1Description = `The step 1 involves interpolating for the required value of Za = ${CalculatedParams.Ra_over_W_cube_root.toFixed(3)} using the UFC 3-340-02 provided shock pressure curves. The following charts illustrate the interpolated shock pressure curves for Za.`;
      const step1HeaderHTML = renderToStaticMarkup(<PDFStepHeader stepNum={1} description={step1Description} />);
      await renderSection(step1HeaderHTML);

      const step1ChartPromises = combineChartsByFilters(ShockPressureSteps[2] || [], ShockPressureSteps[3] || []).map(curve =>
        renderChartToBase64(curve, { width: 400, height: 300 })
      );
      currentY = addChartsToPdf(pdf, await Promise.all(step1ChartPromises), currentY, contentWidth, pdfHeight, margin);

      // Step 2 for pressure charts
      pdf.addPage();
      currentY = margin;
      const step2Description = `The step 2 involves combining charts from step 1 by L/H ratios  for given Za =  ${CalculatedParams.Ra_over_W_cube_root.toFixed(3)} and interpolating for L/H =${CalculatedParams.L_over_H.toFixed(3)}. `;
      const step2HeaderHTML = renderToStaticMarkup(<PDFStepHeader stepNum={2} description={step2Description} />);
      await renderSection(step2HeaderHTML);
      const step2ChartPromises = combineChartsByFilters(ShockPressureSteps[4] || [], ShockPressureSteps[5] || []).map(curve =>
        renderChartToBase64(curve, { width: 400, height: 300 })
      );
      currentY = addChartsToPdf(pdf, await Promise.all(step2ChartPromises), currentY, contentWidth, pdfHeight, margin);

      // Step 3 for pressure charts
      pdf.addPage();
      currentY = margin;
      const step3Description = `The step 3 involves combining charts from step 2 by l/H ratios  for given Za =  ${CalculatedParams.Ra_over_W_cube_root.toFixed(3)} 
        and  L/H =${CalculatedParams.L_over_H.toFixed(3)} and then interpolating for l/L = ${CalculatedParams.l_over_L.toFixed(3)}.`;
      const step3HeaderHTML = renderToStaticMarkup(<PDFStepHeader stepNum={3} description={step3Description} />);
      await renderSection(step3HeaderHTML);
      const step3ChartPromises = combineChartsByFilters(ShockPressureSteps[6] || [], ShockPressureSteps[7] || []).map(curve =>
        renderChartToBase64(curve, { width: 400, height: 300 })
      );
      currentY = addChartsToPdf(pdf, await Promise.all(step3ChartPromises), currentY, contentWidth, pdfHeight, margin);

      // Step 4 for pressure charts
      pdf.addPage();
      currentY = margin;

      await renderSection(
        renderToStaticMarkup(
          <PDFStepHeader
            stepNum={4}
            description={`The step 4 involves combining charts from step 3 by h/H ratios  for given Za =  ${CalculatedParams.Ra_over_W_cube_root.toFixed(3)} 
        and  L/H =${CalculatedParams.L_over_H.toFixed(3)} and  l/L = ${CalculatedParams.l_over_L.toFixed(3)}
        and then interpolating for h/H = ${CalculatedParams.h_over_H.toFixed(3)}.`}
          />
        )
      );

      currentY = addChartsToPdf(
        pdf,
        await Promise.all(
          combineChartsByFilters(ShockPressureSteps[8] || [], ShockPressureSteps[9] || []).map(curve => renderChartToBase64(curve, { width: 400, height: 300 }))
        ),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );

      // Step 5: Final Chart
      await renderSection(renderToStaticMarkup(<SectionHeader {...{ title: 'Final Shock Pressure Chart' }} />));
      currentY = addChartsToPdf(
        pdf,
        await renderChartToBase64(ShockPressureSteps[9][0], { width: 400, height: 300 }, [CalculatedParams.L_over_Ra, CalculatedParams.Ps]).then(base64 => [
          base64
        ]),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );

      await renderSection(
        renderToStaticMarkup(<Paragraph text={`The final interpolated shock pressure at the target wall is Ps = ${CalculatedParams.Ps.toFixed(2)} psi.`} />)
      );

      await renderSection(
        renderToStaticMarkup(<Paragraph text={`Similar steps are repeater for Shock Impulse = ${CalculatedParams.Is.toFixed(2)} psi-msec.`} />)
      );

      pdf.addPage();
      currentY = margin;
      await renderSection(renderToStaticMarkup(<SectionHeader {...{ title: 'Gas Pressure Steps' }} />));
      console.log(GasPressureSteps[1][0]);
      currentY = addChartsToPdf(
        pdf,
        await renderChartToBase64(GasPressureSteps[1][0], { width: 400, height: 300 }, [CalculatedParams.W_over_Vf, CalculatedParams.Pg]).then(base64 => [
          base64
        ]),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );
      await renderSection(
        renderToStaticMarkup(<Paragraph text={`The final interpolated gas pressure at the target wall is Pg = ${CalculatedParams.Pg.toFixed(2)} psi.`} />)
      );

      // Gas Impulse Steps
      pdf.addPage();
      currentY = margin;
      await renderSection(renderToStaticMarkup(<SectionHeader {...{ title: 'Gas Impulse Steps' }} />));
      await renderSection(
        renderToStaticMarkup(
          <PDFStepHeader
            stepNum={1}
            description={`All the curves from Fig 2-153 to Fig 2-164 in UFC 3-340-02 are interpolated for Wf/W^(1/3) = ${CalculatedParams.Wf_over_W_cube_root} `}
          />
        )
      );

      currentY = addChartsToPdf(
        pdf,
        await Promise.all(
          combineChartsByFilters(GasImpulseSteps[1] || [], GasImpulseSteps[2] || []).map(curve => renderChartToBase64(curve, { width: 400, height: 300 }))
        ),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );

      // Gas impulse step 2
      pdf.addPage();
      currentY = margin;
      await renderSection(
        renderToStaticMarkup(
          <PDFStepHeader
            stepNum={2}
            description={`All the curves are then combined by i/W^(1/3) and interpolated for required value = ${CalculatedParams.i_over_W_cube_root} `}
          />
        )
      );

      currentY = addChartsToPdf(
        pdf,
        await Promise.all(
          combineChartsByFilters(GasImpulseSteps[3] || [], GasImpulseSteps[4] || []).map(curve => renderChartToBase64(curve, { width: 400, height: 300 }))
        ),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );

      // Gas impulse step 3
      pdf.addPage();
      currentY = margin;
      await renderSection(
        renderToStaticMarkup(
          <PDFStepHeader
            stepNum={3}
            description={`All the curves are then combined by W/Vf and interpolated for required value = ${CalculatedParams.W_over_Vf} `}
          />
        )
      );

      currentY = addChartsToPdf(
        pdf,
        await Promise.all(
          combineChartsByFilters(GasImpulseSteps[5] || [], GasImpulseSteps[6] || []).map(curve => renderChartToBase64(curve, { width: 400, height: 300 }))
        ),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );

      // Final Gas Pressure
      await renderSection(
        renderToStaticMarkup(
          <PDFStepHeader stepNum={4} description={`The final chart is interpolated for A/V^(2/3) = ${CalculatedParams.A_over_Vf_cube_root_squared}`} />
        )
      );

      currentY = addChartsToPdf(
        pdf,
        await renderChartToBase64(GasImpulseSteps[6][0], { width: 400, height: 300 }, [CalculatedParams.A_over_Vf_cube_root_squared, CalculatedParams.Ig]).then(
          base64 => [base64]
        ),
        currentY,
        contentWidth,
        pdfHeight,
        margin
      );
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
 * Combine charts by matching filters - replicates backend _render_and_combine_graphs logic.
 * Takes original curves and interpolated curves, matches them by filters field,
 * and appends interpolated curve data to the original curves.
 *
 * @param originalCurves - Original GRF curves
 * @param interpolatedCurves - Interpolated GRF curves to merge
 * @returns Array of combined GRF curves
 */
function combineChartsByFilters(originalCurves: GRFPipelineCurve[], interpolatedCurves: GRFPipelineCurve[]): GRFPipelineCurve[] {
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

function addChartsToPdf(pdf: jsPDF, chartBase64s: string[], startY: number, contentWidth: number, pdfHeight: number, margin: number): number {
  let currentY = startY;
  const chartWidth = 85;
  const chartHeight = 64;
  const chartGap = 2;
  const rowHeight = chartHeight + 5;

  for (let i = 0; i < chartBase64s.length; i += 2) {
    const chart1 = chartBase64s[i];
    const chart2 = chartBase64s[i + 1];

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

  return currentY;
}
