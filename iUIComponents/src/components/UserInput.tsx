import { useState, useRef, useEffect, type ChangeEvent } from "react";
import styles from "./UserInput.module.css";

/**
 * Safely evaluates a mathematical expression.
 * Returns the evaluated result or null if invalid.
 * Export this so parent components can use it when needed.
 */
export function evaluateExpression(expr: string): number | null {
  try {
    // Remove whitespace
    const cleaned = expr.trim();

    // If it's just a number, return it
    const directNumber = parseFloat(cleaned);
    if (!isNaN(directNumber) && cleaned === String(directNumber)) {
      return directNumber;
    }

    // Only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*/(). ]+$/.test(cleaned)) {
      return null;
    }

    // Prevent dangerous patterns
    if (
      cleaned.includes("..") ||
      /[+\-*/]{2,}/.test(cleaned.replace(/\*\*/g, ""))
    ) {
      return null;
    }

    // Evaluate using Function constructor (safer than eval)
    const result = new Function(`'use strict'; return (${cleaned})`)();

    // Verify result is a valid number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }

    return null;
  } catch {
    return null;
  }
}

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null; // Returns error message or null
}

export interface UserInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  unit?: string;
  helpText?: string;
  type?: "text" | "number" | "expression"; // "expression" allows math like "1*2"
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  validation?: ValidationRule;
}

export function UserInput({
  label,
  value,
  onChange,
  unit,
  helpText,
  type = "text",
  placeholder,
  disabled = false,
  className = "",
  validation,
}: UserInputProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Validate the input value
  const validateInput = (inputValue: string): string | null => {
    if (!validation) return null;

    const stringValue = String(inputValue);
    const numericValue =
      type === "number" || type === "expression" ? parseFloat(inputValue) : NaN;

    // Required check
    if (validation.required && !stringValue.trim()) {
      return "This field is required";
    }

    // Skip other validations if empty and not required
    if (!stringValue.trim()) return null;

    // For expression type, validate that it's a valid expression
    if (type === "expression") {
      const evaluated = evaluateExpression(stringValue);
      if (evaluated === null) {
        return "Invalid mathematical expression";
      }
      // Use evaluated value for min/max checks
      if (validation.min !== undefined && evaluated < validation.min) {
        return `Value must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && evaluated > validation.max) {
        return `Value must be at most ${validation.max}`;
      }
    }
    // Min/Max for numbers
    else if (type === "number" && !isNaN(numericValue)) {
      if (validation.min !== undefined && numericValue < validation.min) {
        return `Value must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && numericValue > validation.max) {
        return `Value must be at most ${validation.max}`;
      }
    }

    // Min/Max length for text
    if (
      validation.minLength !== undefined &&
      stringValue.length < validation.minLength
    ) {
      return `Must be at least ${validation.minLength} characters`;
    }
    if (
      validation.maxLength !== undefined &&
      stringValue.length > validation.maxLength
    ) {
      return `Must be at most ${validation.maxLength} characters`;
    }

    // Pattern validation
    if (validation.pattern && !validation.pattern.test(stringValue)) {
      return "Invalid format";
    }

    // Custom validation
    if (validation.custom) {
      return validation.custom(stringValue);
    }

    return null;
  };

  // Validate on value change
  useEffect(() => {
    const error = validateInput(String(value));
    setErrorMessage(error);
  }, [value, validation]);

  // Close help popup when clicking outside
  useEffect(() => {
    if (!showHelp) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        helpButtonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !helpButtonRef.current.contains(event.target as Node)
      ) {
        setShowHelp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHelp]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    // For expression type, validate but don't auto-evaluate
    // The parent component can choose to evaluate when needed
    if (type === "expression") {
      const inputValue = e.target.value.trim();
      if (inputValue) {
        const evaluated = evaluateExpression(inputValue);
        if (evaluated === null) {
          // Invalid expression - could set an error here
          // For now, just leave it as-is
          return;
        }
        // Expression is valid but we keep it as-is in the field
      }
    }
    // For number type, still auto-evaluate
    else if (type === "number") {
      const inputValue = e.target.value.trim();
      if (inputValue) {
        const evaluated = evaluateExpression(inputValue);
        if (evaluated !== null) {
          onChange(String(evaluated));
        }
      }
    }
  };

  const hasError = !!errorMessage;

  return (
    <div className={styles.userInput}>
      <label className={styles.uiLabel}>{label}</label>

      {/* Always render unit space for consistent alignment */}
        <span className={styles.uiUnit}>       
          {unit ? "(" + unit + ")": ""}
        </span>

      {/* Always render help button space for consistent alignment */}
      {helpText ? (
        <div className={styles.uiHelpContainer}>
          <button
            ref={helpButtonRef}
            type="button"
            className={styles.uiHelpButton}
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Help"
          >
            ?
          </button>
          {showHelp && (
            <div ref={popupRef} className={styles.uiHelpPopup}>
              {helpText}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.uiHelpPlaceholder} />
      )}

      <div className={styles.uiInputWrapper}>
        <input
          type={type === "expression" ? "text" : type}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${styles.uiInput} ${hasError ? styles.uiInputError : ""}`}
          title={errorMessage || undefined}
          inputMode={type === "expression" ? "decimal" : undefined}
        />
        {hasError && <div className={styles.uiErrorTooltip}>{errorMessage}</div>}
      </div>
    </div>
  );
}
