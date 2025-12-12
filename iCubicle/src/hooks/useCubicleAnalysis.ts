import { useState, useCallback, useEffect } from 'react';
import { type CubicleType, type TargetType, type TargetFaceType } from '../types';
import { CubicleTypes, TargetType as TargetTypeConst, WallEnum } from '../constants';
import { fetchCubicleData, type CubicleRequest, type CubicleResponse } from '../api';

function isValidWallEnum(value: string | null): boolean {
  if (!value) return false;
  return (Object.values(WallEnum) as string[]).includes(value);
}

export function useCubicleAnalysis() {
  const [length, setLength] = useState('12');
  const [width, setWidth] = useState('16');
  const [height, setHeight] = useState('35');
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

  // Parse URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('length')) setLength(params.get('length') || '10');
    if (params.has('width')) setWidth(params.get('width') || '15');
    if (params.has('height')) setHeight(params.get('height') || '20');
    if (params.has('utilization')) setUtilization(params.get('utilization') || '0.5');
    if (params.has('openingWidth')) setOpeningWidth(params.get('openingWidth') || '0.1');
    if (params.has('openingHeight')) setOpeningHeight(params.get('openingHeight') || '0.1');
    if (params.has('openingWf')) setOpeningWf(params.get('openingWf') || '0.0');
    if (params.has('cubicleType')) setCubicleType((params.get('cubicleType') as CubicleType) || CubicleTypes.CantileverWall);
    if (params.has('threatXLocation')) setThreatXLocation(params.get('threatXLocation') || '5.0');
    if (params.has('threatYLocation')) setThreatYLocation(params.get('threatYLocation') || '10.0');
    if (params.has('threatZLocation')) setThreatZLocation(params.get('threatZLocation') || '5.0');
    if (params.has('threatWeight')) setThreatWeight(params.get('threatWeight') || '12.0');
    if (params.has('targetType')) setTargetType((params.get('targetType') as TargetType) || TargetTypeConst.FullWall);
    if (params.has('stripHeight')) setStripHeight(params.get('stripHeight') || '1.0');
    if (params.has('stripWidth')) setStripWidth(params.get('stripWidth') || '1.0');
    // Safe enum casting with validation for targetFace
    if (params.has('targetFace')) {
      const faceParam = params.get('targetFace');
      if (isValidWallEnum(faceParam)) {
        setTargetFace(faceParam as unknown as TargetFaceType);
      } else {
        setTargetFace(WallEnum.WALL_1);
      }
    }

    // Safe enum casting with validation for openingFace
    if (params.has('openingFace')) {
      const openingFaceParam = params.get('openingFace');
      if (isValidWallEnum(openingFaceParam)) {
        setOpeningFace(openingFaceParam as unknown as WallEnum);
      } else {
        setOpeningFace(WallEnum.WALL_1);
      }
    }
  }, []);

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
