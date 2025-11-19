import { useState, useCallback } from 'react';
import { type CubicleType, type TargetType, type TargetFaceType } from '../types';
import { CubicleTypes, TargetType as TargetTypeConst, TargetFaceType as TargetFaceTypeConst } from '../constants';
import { fetchCubicleData, type CubicleRequest } from '../api';

export function useCubicleAnalysis() {
  const [length, setLength] = useState('2');
  const [width, setWidth] = useState('2');
  const [height, setHeight] = useState('2');
  const [openingWidth, setOpeningWidth] = useState('0.8');
  const [openingHeight, setOpeningHeight] = useState('1.2');
  const [openingFace, setOpeningFace] = useState<'front' | 'back' | 'left' | 'right' | 'floor' | 'roof'>('front');
  const [cubicleType, setCubicleType] = useState<CubicleType>(CubicleTypes.ThreeWalls);

  const [threatXLocation, setThreatXLocation] = useState('1.0');
  const [threatYLocation, setThreatYLocation] = useState('1.0');
  const [threatZLocation, setThreatZLocation] = useState('1.0');
  const [threatWeight, setThreatWeight] = useState('10.0');

  const [targetType, setTargetType] = useState<TargetType>(TargetTypeConst.FullWall);
  const [targetFace, setTargetFace] = useState<TargetFaceType>(TargetFaceTypeConst.BackWall);
  const [stripHeight, setStripHeight] = useState('1.0');
  const [stripWidth, setStripWidth] = useState('1.0');

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const setFieldError = useCallback((fieldName: string, hasError: boolean) => {
    setValidationErrors(prev => {
      if (prev[fieldName] === hasError) {
        return prev;
      }
      return { ...prev, [fieldName]: hasError };
    });
  }, []);

  const hasAnyErrors = Object.values(validationErrors).some(hasError => hasError);

  const handleAnalyze = useCallback(() => {
    if (hasAnyErrors || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const requestData: CubicleRequest = {
      cubicle_type: cubicleType,
      target_face: targetFace,
      Lc: Number(length),
      Wc: Number(width),
      Hc: Number(height),
      X: Number(threatXLocation),
      Y: Number(threatYLocation),
      Z: Number(threatZLocation),
      Wo: Number(openingWidth),
      Ho: Number(openingHeight),
      W: Number(threatWeight)
    };

    fetchCubicleData(requestData)
      .then(response => {
        if (response.success && response.result) {
          const { pressure, impulse, parameters } = response.result;

          let resultHtml = `<p><strong>Pressure:</strong> ${pressure.toFixed(2)} psi</p>`;

          if (impulse && typeof impulse === 'object') {
            resultHtml += '<p><strong>Impulse:</strong></p><ul>';
            Object.entries(impulse).forEach(([key, value]) => {
              resultHtml += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            resultHtml += '</ul>';
          }

          if (parameters && typeof parameters === 'object') {
            resultHtml += '<p><strong>Parameters:</strong></p><ul>';
            Object.entries(parameters).forEach(([key, value]) => {
              resultHtml += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            resultHtml += '</ul>';
          }

          setAnalysisResult(resultHtml);
        } else {
          setAnalysisError(response.message || 'Analysis failed');
        }
      })
      .catch(error => {
        setAnalysisError(error instanceof Error ? error.message : 'Unknown error occurred');
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [
    hasAnyErrors,
    isAnalyzing,
    cubicleType,
    targetFace,
    length,
    width,
    height,
    threatXLocation,
    threatYLocation,
    threatZLocation,
    openingWidth,
    openingHeight,
    threatWeight
  ]);

  return {
    // Dimensions
    length,
    setLength,
    width,
    setWidth,
    height,
    setHeight,

    // Opening
    openingWidth,
    setOpeningWidth,
    openingHeight,
    setOpeningHeight,
    openingFace,
    setOpeningFace,

    // Cubicle type
    cubicleType,
    setCubicleType,

    // Threat
    threatXLocation,
    setThreatXLocation,
    threatYLocation,
    setThreatYLocation,
    threatZLocation,
    setThreatZLocation,
    threatWeight,
    setThreatWeight,

    // Target
    targetType,
    setTargetType,
    targetFace,
    setTargetFace,
    stripHeight,
    setStripHeight,
    stripWidth,
    setStripWidth,

    // Validation & Analysis
    setFieldError,
    isValid: !hasAnyErrors,
    isAnalyzing,
    analysisResult,
    analysisError,
    handleAnalyze
  };
}
