import {type PostData, type ResultData, type GrfCurve} from "./api-types";
import { API_URL, GRF_URL } from "./config";


export async function PostVentedtedBlast(data: PostData): Promise<ResultData> {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const result: ResultData = await response.json();
    return result;  
}


export async function fetchGRFData(plotID: string): Promise<GrfCurve> {
    const response = await fetch(GRF_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "filename": plotID }),
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const result = await response.json();
    console.log("GRF Data:", result);
    return result;
}