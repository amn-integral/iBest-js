import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import styles from './UserInput.module.css';

/**
 * Safely evaluates a mathematical expression.
 * Returns the evaluated result or null if invalid.
 * Export this so parent components can use it when needed.
 */
// eslint-disable-next-line react-refresh/only-export-components
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
		if (cleaned.includes('..') || /[+\-*/]{2,}/.test(cleaned.replace(/\*\*/g, ''))) {
			return null;
		}

		// Evaluate using Function constructor (safer than eval)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-implied-eval
		const result = new Function(`'use strict'; return (${cleaned})`)();

		// Verify result is a valid number
		if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
			return result;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Validates CSV format string.
 * Returns error message or null if valid.
 */
function validateCsvFormat(csvString: string): string | null {
	try {
		const trimmed = csvString.trim();

		// Empty string is valid (optional field)
		if (!trimmed) return null;

		// Check for common mistakes - using wrong separators
		if (trimmed.includes(':') && !trimmed.includes(',')) {
			return 'CSV format uses commas (,) as separators, not colons (:)';
		}
		if (trimmed.includes(';') && !trimmed.includes(',')) {
			return 'CSV format uses commas (,) as separators, not semicolons (;)';
		}
		if (trimmed.includes('|') && !trimmed.includes(',')) {
			return 'CSV format uses commas (,) as separators, not pipes (|)';
		}

		// For single-line CSV, split by lines (in case user pastes multiline) or treat as single line
		const lines = trimmed.split(/\r?\n/).filter(line => line.trim());

		if (lines.length === 0) return null;

		let columnCount: number | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Basic CSV parsing - split by comma but handle quoted values
			const values = parseCsvLine(line);

			if (!values) {
				return lines.length > 1 ? `Invalid CSV format on line ${i + 1}` : 'Invalid CSV format';
			}

			// Check that we have at least one value
			if (values.length === 0) {
				return 'CSV must contain at least one value';
			}

			// Check consistent column count for multiline
			if (lines.length > 1) {
				if (columnCount === null) {
					columnCount = values.length;
				} else if (values.length !== columnCount) {
					return `Inconsistent number of columns on line ${i + 1} (expected ${columnCount}, got ${values.length})`;
				}
			}

			// Validate that numeric values can be parsed if they're not quoted strings
			for (let j = 0; j < values.length; j++) {
				const value = values[j];
				// Skip empty values
				if (!value) continue;

				// If it looks like it should be a number (not quoted and contains numeric chars)
				if (!/^".*"$/.test(value)) {
					const numValue = parseFloat(value);
					// Check if it's a numeric string that should parse
					if (/^[0-9+\-.,\s]+$/.test(value) && isNaN(numValue)) {
						const position = lines.length > 1 ? `line ${i + 1}, column ${j + 1}` : `position ${j + 1}`;
						return `Invalid numeric value "${value}" at ${position}`;
					}
				}
			}
		}

		return null;
	} catch (error) {
		return `Invalid CSV format {${(error as Error).message}}`;
	}
} /**
 * Simple CSV line parser that handles quoted values.
 * Returns array of values or null if invalid.
 */
function parseCsvLine(line: string): string[] | null {
	try {
		const values: string[] = [];
		let current = '';
		let inQuotes = false;
		let i = 0;

		while (i < line.length) {
			const char = line[i];

			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					// Escaped quote
					current += '"';
					i += 2;
				} else {
					// Toggle quote state
					inQuotes = !inQuotes;
					i++;
				}
			} else if (char === ',' && !inQuotes) {
				// Field separator
				values.push(current.trim());
				current = '';
				i++;
			} else {
				current += char;
				i++;
			}
		}

		// Add the last field
		values.push(current.trim());

		// Check for unclosed quotes
		if (inQuotes) {
			return null;
		}

		return values;
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
	type?: 'text' | 'number' | 'expression' | 'csv'; // "expression" allows math like "1*2"
	placeholder?: string;
	disabled?: boolean;
	validation?: ValidationRule;
	fontSize?: string; // e.g. "small", "medium", "large", "12px", "14px", etc.
	onValidationChange?: (hasError: boolean) => void; // Callback when validation state changes
}

export function UserInput({
	label,
	value,
	onChange,
	unit,
	helpText,
	type = 'text',
	placeholder,
	disabled = false,
	validation,
	fontSize = 'medium',
	onValidationChange
}: UserInputProps) {
	const [showHelp, setShowHelp] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const helpButtonRef = useRef<HTMLButtonElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);

	// Validate the input value
	const validateInput = useCallback(
		(inputValue: string): string | null => {
			const stringValue = String(inputValue);
			const numericValue = type === 'number' || type === 'expression' ? parseFloat(inputValue) : NaN;

			// Required check
			if (validation?.required && !stringValue.trim()) {
				return 'This field is required';
			}

			// Skip other validations if empty and not required
			if (!stringValue.trim()) return null;

			// For expression type, validate that it's a valid expression
			if (type === 'expression') {
				const evaluated = evaluateExpression(stringValue);
				if (evaluated === null) {
					return 'Invalid mathematical expression';
				}
				// Use evaluated value for min/max checks
				if (validation?.min !== undefined && evaluated < validation.min) {
					return `Value must be at least ${validation.min}`;
				}
				if (validation?.max !== undefined && evaluated > validation.max) {
					return `Value must be at most ${validation.max}`;
				}
			}
			// For CSV type, validate that it's a valid CSV format (always validate for CSV type)
			else if (type === 'csv') {
				const csvError = validateCsvFormat(stringValue);
				if (csvError) {
					return csvError;
				}
			}
			// Min/Max for numbers
			else if (type === 'number' && !isNaN(numericValue)) {
				if (validation?.min !== undefined && numericValue < validation.min) {
					return `Value must be at least ${validation.min}`;
				}
				if (validation?.max !== undefined && numericValue > validation.max) {
					return `Value must be at most ${validation.max}`;
				}
			}

			// Min/Max length for text
			if (validation?.minLength !== undefined && stringValue.length < validation.minLength) {
				return `Must be at least ${validation.minLength} characters`;
			}
			if (validation?.maxLength !== undefined && stringValue.length > validation.maxLength) {
				return `Must be at most ${validation.maxLength} characters`;
			}

			// Pattern validation
			if (validation?.pattern && !validation.pattern.test(stringValue)) {
				return 'Invalid format';
			}

			// Custom validation
			if (validation?.custom) {
				return validation.custom(stringValue);
			}

			return null;
		},
		[type, validation]
	);

	// Validate on mount and when value/validation changes
	useEffect(() => {
		const error = validateInput(String(value));
		setErrorMessage(error);
		onValidationChange?.(error !== null);
	}, [value, validation, type, onValidationChange, validateInput]);

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

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showHelp]);

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		onChange(inputValue);
		if (type === 'number' && /^-?$|^-?\d*\.?$/.test(inputValue)) {
			setErrorMessage(null);
			return;
		}

		if (
			type === 'expression' &&
			// Allow partial math inputs like "-", "-1*", "1+", "3/(", etc.
			/^[-+*/().\d\s]*$/.test(inputValue)
		) {
			// Don’t show error until expression is complete (ends with number or ')')
			if (/[0-9)]$/.test(inputValue.trim())) {
				const err = validateInput(inputValue);
				setErrorMessage(err);
			} else {
				setErrorMessage(null);
			}
			return;
		}
	};

	const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
		// For expression type, validate but don't auto-evaluate
		// The parent component can choose to evaluate when needed

		const error = validateInput(String(value));
		setErrorMessage(error);
		if (type === 'expression') {
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
		else if (type === 'number') {
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
			<label className={styles.uiLabel} style={{ fontSize }}>
				{label}
			</label>

			{/* Always render unit space for consistent alignment */}
			<span className={styles.uiUnit} style={{ fontSize }}>
				{unit ? '(' + unit + ')' : ''}
			</span>

			{/* Always render help button space for consistent alignment */}
			{helpText ? (
				<div className={styles.uiHelpContainer}>
					<button ref={helpButtonRef} type="button" className={styles.uiHelpButton} onClick={() => setShowHelp(!showHelp)} aria-label="Help">
						?
					</button>
					{showHelp && (
						<div ref={popupRef} className={styles.uiHelpPopup} style={{ fontSize }}>
							{helpText}
						</div>
					)}
				</div>
			) : (
				<div className={styles.uiHelpPlaceholder} />
			)}

			<div className={styles.uiInputWrapper}>
				<input
					type={'text'}
					value={value}
					onChange={handleInputChange}
					onBlur={handleBlur}
					placeholder={placeholder || (type === 'csv' ? 'value1,value2,value3' : undefined)}
					disabled={disabled}
					className={`${styles.uiInput} ${hasError ? styles.uiInputError : ''}`}
					style={{ fontSize }}
					title={errorMessage || undefined}
					inputMode={type === 'number' || type === 'expression' ? 'decimal' : undefined}
				/>
				{hasError && <div className={styles.uiErrorTooltip}>{errorMessage}</div>}
			</div>
		</div>
	);
}
