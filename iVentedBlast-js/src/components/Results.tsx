// import { NumberInput } from "./NumberInput";
import React from "react";
import { fetchGRFData } from "src/api/api";
import { type GrfCurve } from "src/api/api-types";
import resultsCss from "./Results.module.css";
import type { ResultProps } from "../../../iMath/src/ventedCubicle";
import { Sup, Unit } from "./Units";

const fmt = (n?: number, max = 3) =>
  n?.toLocaleString(undefined, { maximumFractionDigits: max }) ?? "—";

export const Results: React.FC<{ results: ResultProps | null}> = ({ results}) => {
  const [activeTab, setActiveTab] = React.useState<"summary" | "grf" | "raw">("summary");
  const [grfData, setGrfData] = React.useState<GrfCurve | null>(null);


  return (
      <div className={resultsCss.resultsLayout}>
        <div className={resultsCss.resultsTabs}>
          <button onClick={() => setActiveTab("summary")}>Summary</button>
          <button onClick={() => setActiveTab("grf")}>GRF Data</button>
          <button onClick={() => setActiveTab("raw")}>Raw Data</button>
        </div>
        <div> 
          {activeTab === "summary" && results && (

            <div className={resultsCss.summaryTab}>
              <div>
                <dl className={resultsCss.kv}>
                  <div><dt>Volume</dt><dd>{fmt(results?.volume)} ft<sup>3</sup></dd></div>
                  <div><dt>Length</dt><dd>{fmt(results?.length)} ft</dd></div>
                  <div><dt>Breadth</dt><dd>{fmt(results?.breadth)} ft</dd></div>
                  <div><dt>Height</dt><dd>{fmt(results?.height)} ft</dd></div>
                  <div><dt>Charge Weight</dt><dd>{fmt(results?.W)} lb</dd></div>
                  <div><dt>Charge Standoff</dt><dd>{fmt(results?.R)} ft</dd></div>
                  <div>
                    <dt>Scaled Distance, Z</dt>
                    <dd>{fmt(results?.Z)} <Unit>ft·lb<Sup>−1/3</Sup></Unit></dd>
                  </div>
                  <div><dt>Weight/Volume</dt><dd>{fmt(results?.W_Vol)} lb/ft<sup>3</sup></dd></div>
                  <div className={resultsCss.kvDivider}></div>
                </dl>
              </div>
              
              <div>
                <dl className={resultsCss.kv}>
                  <div><dt>Pressure at Front</dt><dd>{fmt(results?.Pso_front)} psi</dd></div>
                  <div><dt>Pressure at Side</dt><dd>{fmt(results?.Pso_side)} psi</dd></div>
                  <div><dt>Pressure at Back</dt><dd>{fmt(results?.Pso_back)} psi</dd></div>

                </dl>
              </div>
            </div>



          )}
          {activeTab === "grf" && (
            <div>
              <button
                onClick={() =>
                  fetchGRFData("02_168.GRF").then((data: GrfCurve) => {
                    setGrfData(data);
                    console.log("Fetched GRF Data:", data);
                  })
                }
              >
                Fetch Data
              </button>
              {grfData && (
                <div>
                  <h4>GRF File: {grfData.filename}</h4>
                  <p>
                    <strong>X Label:</strong> {grfData.xlabel} <br />
                    <strong>Y Label:</strong> {grfData.ylabel}
                  </p>
                  <ul>
                    {grfData.curves.map((curve, idx) => (
                      <li key={idx}>
                        <strong>{curve.curve_name}</strong> ({curve.num_points} points)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {activeTab === "raw" && (
            <div>
            </div>
          )}
        </div>
      </div>
  );
}