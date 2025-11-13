import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import styles from './UserDropdown.module.css';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface UDValidationRule {
  required?: boolean;
  custom?: (value: string) => string | null; // Returns error message or null
}

export interface UserDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  unit?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  validation?: UDValidationRule;
  fontSize?: string; // e.g. "small", "medium", "large", "12px", "14px", etc.
  className?: string;
}

export function UserDropdown({
  label,
  value,
  onChange,
  options,
  unit,
  helpText,
  placeholder,
  disabled = false,
  validation,
  fontSize = 'medium',
  className
}: UserDropdownProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Validate the dropdown value
  const validateInput = (inputValue: string): string | null => {
    const stringValue = String(inputValue);

    // Required check
    if (validation?.required && !stringValue.trim()) {
      return 'This field is required';
    }

    // Skip other validations if empty and not required
    if (!stringValue.trim()) return null;

    // Custom validation
    if (validation?.custom) {
      return validation.custom(stringValue);
    }

    return null;
  };

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

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectValue = e.target.value;
    onChange(selectValue);

    // Validate on change
    const error = validateInput(selectValue);
    setErrorMessage(error);
  };

  const handleBlur = () => {
    // Validate on blur
    const error = validateInput(String(value));
    setErrorMessage(error);
  };

  const hasError = !!errorMessage;

  return (
    <div className={styles.userDropdown + (className ? ` ${className}` : '')}>
      <label className={styles.udLabel} style={{ fontSize }}>
        {label}
      </label>

      {/* Always render unit space for consistent alignment */}
      <span className={styles.udUnit} style={{ fontSize }}>
        {unit ? '(' + unit + ')' : ''}
      </span>

      {/* Always render help button space for consistent alignment */}
      {helpText ? (
        <div className={styles.udHelpContainer}>
          <button ref={helpButtonRef} type="button" className={styles.udHelpButton} onClick={() => setShowHelp(!showHelp)} aria-label="Help">
            ?
          </button>
          {showHelp && (
            <div ref={popupRef} className={styles.udHelpPopup} style={{ fontSize }}>
              {helpText}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.udHelpPlaceholder} />
      )}

      <div className={styles.udSelectWrapper}>
        <select
          value={value}
          onChange={handleSelectChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={`${styles.udSelect} ${hasError ? styles.udSelectError : ''}`}
          style={{ fontSize }}
          title={errorMessage || undefined}
          aria-label={label}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {hasError && <div className={styles.udErrorTooltip}>{errorMessage}</div>}
      </div>
    </div>
  );
}
