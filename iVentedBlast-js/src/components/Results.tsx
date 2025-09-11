// import {addNumbers} from "@integralrsg/imath";
import { NumberInput} from "./NumberInput";
import React from "react";
import { type ResultData } from "src/api/api-types";

export const Results: React.FC<{ results: ResultData  | null}> = ({ results }) => {

  const [a, setA] = React.useState(2);
  const [b, setB] = React.useState(3);
  const [addResult, setAddResult] = React.useState<number | null>(null);

  function addNumbers(a: number, b: number) {
      fetch('/api/add/', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              // If you use CSRF protection, include the CSRF token here
              // 'X-CSRFToken': getCookie('csrftoken')
          },
          body: JSON.stringify({ a: a, b: b })
      })
      .then(response => response.json().then(data => {
          console.log('Response:', response);
          setAddResult(data.result);
          console.log('Sum:', data.result);
          // Do something with data.result
      })
      .catch(error => {
          console.error('Error:', error);
      }));
  }


  return (
    <div>
      <h2>Results</h2>
      <p>Here are the results of your analysis:</p>
      {/* Render results here */}
      <NumberInput label="a" value={a} onChange={setA} />
      <NumberInput label="b" value={b} onChange={setB} />
      <p>Result: {addResult}</p>
      <button onClick={() => addNumbers(a, b)}>Calculate</button>

      <p>Here are the results of your analysis:</p>
      {results && Object.keys(results).length > 0 ? (
        <ul>
          {Object.entries(results).map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {String(value)}
            </li>
          ))}
        </ul>
      ) : (
        <p>No results yet.</p>
      )}    
    </div>
  );
}