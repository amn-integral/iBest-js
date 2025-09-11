import {type PostData } from "./api-types";
import {type ResultData } from "./api-types";
import { API_URL } from "./config";


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