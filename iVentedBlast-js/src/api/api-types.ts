export type PostData = {
    cubicleType: string;
    l: number;
    b: number;
    h: number;
    openingFace?: string;
    openingWidth?: number;
    openingHeight?: number;
    chargeWeight: number;
    chargeStandoff: number;
    chargeAngle: number;
    pMax: number;
    iMax: number;
}

export type ResultData = {
    inputs: PostData;
    pressure: number;
} 