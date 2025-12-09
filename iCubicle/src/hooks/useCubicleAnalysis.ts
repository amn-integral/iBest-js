import { useState, useCallback } from 'react';
import { type CubicleType, type TargetType, type TargetFaceType } from '../types';
import { CubicleTypes, TargetType as TargetTypeConst, WallEnum } from '../constants';
import { fetchCubicleData, type CubicleRequest, type CubicleResponse } from '../api';

export function useCubicleAnalysis() {
  const [length, setLength] = useState('10');
  const [width, setWidth] = useState('15');
  const [height, setHeight] = useState('20');
  const [utilization, setUtilization] = useState('0.5');
  const [openingWidth, setOpeningWidth] = useState('0.1');
  const [openingHeight, setOpeningHeight] = useState('0.1');
  const [openingWf, setOpeningWf] = useState('0.0');
  const [openingFace, setOpeningFace] = useState<WallEnum>(WallEnum.WALL_1);
  const [cubicleType, setCubicleType] = useState<CubicleType>(CubicleTypes.CantileverWall);

  const [threatXLocation, setThreatXLocation] = useState('5.0');
  const [threatYLocation, setThreatYLocation] = useState('10.0');
  const [threatZLocation, setThreatZLocation] = useState('5.0');
  const [threatWeight, setThreatWeight] = useState('12.0');

  const [targetType, setTargetType] = useState<TargetType>(TargetTypeConst.FullWall);
  const [targetFace, setTargetFace] = useState<TargetFaceType>(WallEnum.WALL_1);
  const [stripHeight, setStripHeight] = useState('1.0');
  const [stripWidth, setStripWidth] = useState('1.0');

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CubicleResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [pressureCurves, setPressureCurves] = useState<
    Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>> | undefined
  >();
  const [impulseCurves, setImpulseCurves] = useState<
    Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>> | undefined
  >();

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
    setPressureCurves(undefined);
    setImpulseCurves(undefined);

    const requestData: CubicleRequest = {
      cubicle_type: cubicleType,
      target_wall: targetFace,
      Lc: Number(length),
      Wc: Number(width),
      Hc: Number(height),
      X: Number(threatXLocation),
      Y: Number(threatYLocation),
      Z: Number(threatZLocation),
      Wo: Number(openingWidth),
      Ho: Number(openingHeight),
      W: Number(threatWeight),
      Wf: Number(openingWf),
      Utilization: Number(utilization)
    };

    fetchCubicleData(requestData)
      .then(response => {
        if (response.success && response.result) {
          setAnalysisResult(response);
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
    threatWeight,
    openingWf,
    utilization
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
    openingWf,
    setOpeningWf,
    openingFace,
    setOpeningFace,

    // Cubicle type
    cubicleType,
    setCubicleType,
    utilization,
    setUtilization,

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
    pressureCurves,
    impulseCurves,
    handleAnalyze
  };
}
