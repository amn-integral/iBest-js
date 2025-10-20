import { useState } from "react";
import { UserInput, evaluateExpression  }from "../src/components/UserInput";

/**
 * Example usage of the UserInput component
 */
export function UserInputExample() {
  const [length, setLength] = useState("10");
  const [width, setWidth] = useState("5");
  const [height, setHeight] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h2>UserInput Component Examples</h2>

      <div
        style={{
          backgroundColor: "#e8e8e8",
          padding: "20px",
          borderRadius: "8px",
        }}
      >
        <h3>Number Inputs with Validation</h3>

        <UserInput
          label="Length"
          value={length}
          onChange={setLength}
          unit="ft"
          helpText="Enter the length of the structure in feet (must be between 1 and 100)"
          type="expression"
          placeholder="Enter length"
          validation={{
            required: true,
            min: 1,
            max: 100,
          }}
          labelWidth="15%"
        />

        <UserInput
          label="Width"
          value={width}
          onChange={setWidth}
          unit="ft"
          helpText="Enter the width of the structure in feet. This measurement should be perpendicular to the length. (must be between 1 and 50)"
          type="number"
          validation={{
            required: true,
            min: 1,
            max: 50,
          }}
          labelWidth="15%"
        />

        <UserInput
          label="Height"
          value={height}
          onChange={setHeight}
          unit="m"
          type="number"
          placeholder="Enter height"
          helpText="Optional: Height in meters (if provided, must be positive)"
          validation={{
            min: 0,
          }}
          labelWidth="15%"
        />

        {/* Example without unit or help to show consistent spacing */}
        <UserInput
          label="Simple Number"
          value="123"
          onChange={() => {}}
          type="number"
          placeholder="No unit, no help"
          labelWidth="15%"
        />
      </div>

      <div
        style={{
          backgroundColor: "#e8e8e8",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        <h3>Text Inputs with Validation</h3>

        <UserInput
          label="Structure Name"
          value={name}
          onChange={setName}
          helpText="Enter a descriptive name for this structure (required, 3-50 characters)"
          type="text"
          placeholder="e.g., Building A"
          validation={{
            required: true,
            minLength: 3,
            maxLength: 50,
          }}
          labelWidth="15%"
        />

        <UserInput
          label="Email"
          value={email}
          onChange={setEmail}
          helpText="Enter a valid email address"
          type="text"
          placeholder="user@example.com"
          validation={{
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            custom: (value) => {
              if (value && !value.includes(".")) {
                return "Email must contain a domain";
              }
              return null;
            },
          }}
          labelWidth="15%"
        />
      </div>

      <div
        style={{
          backgroundColor: "#e8e8e8",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        <h3>Disabled Field</h3>

        <UserInput
          label="Disabled Field"
          value="Cannot edit"
          onChange={() => {}}
          unit="units"
          helpText="This field is disabled and cannot be edited"
          disabled
          labelWidth="15%"
        />
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Current Values:</h3>
        <p>Length: {evaluateExpression(length)} ft</p>
        <p>Width: {width} ft</p>
        <p>Height: {height || "not set"} m</p>
        <p>Name: {name || "not set"}</p>
        <p>Email: {email || "not set"}</p>
      </div>
    </div>
  );
}
