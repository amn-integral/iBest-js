import { type KeyboardEvent, type Ref, useRef, useCallback } from "react";
import styles from "./EditableGrid.module.css";

type CellPosition = { row: number; col: number };

export interface GridCellProps<K extends string> {
  position: CellPosition;
  column: {
    key: K;
    placeholder?: string;
    align?: "left" | "center" | "right";
    width?: number | string;
  };
  value: string;
  isActive: boolean;
  isEditing: boolean;
  cellRef?: Ref<HTMLDivElement>;
  editingInputRef?: Ref<HTMLInputElement>;
  onCellClick: () => void;
  onCellDoubleClick: () => void;
  onCellKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
}

function classNames(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function GridCell<K extends string>({
  position,
  column,
  value,
  isActive,
  isEditing,
  cellRef,
  editingInputRef,
  onCellClick,
  onCellDoubleClick,
  onCellKeyDown,
  onInputKeyDown,
  onInputBlur,
}: GridCellProps<K>) {
  return (
    <td
      key={column.key}
      style={{
        width: column.width,
      }}
      className={classNames(
        styles.editableGridCellWrapper,
        isActive && styles.isActiveColumn
      )}
    >
      <div
        tabIndex={isActive ? 0 : -1}
        ref={cellRef}
        className={classNames(
          styles.editableGridCell,
          isActive && styles.isActive,
          isEditing && styles.isEditing,
          column.align === "right" && styles.alignRight,
          column.align === "center" && styles.alignCenter
        )}
        onClick={onCellClick}
        onDoubleClick={onCellDoubleClick}
        onKeyDown={(event) => {
          // Only handle keydown when not editing
          if (!isEditing) {
            onCellKeyDown(event);
          }
        }}
      >
        {isEditing ? (
          <input
            ref={editingInputRef}
            defaultValue={value}
            onKeyDown={onInputKeyDown}
            onBlur={onInputBlur}
            className={styles.editableGridInput}
            placeholder={column.placeholder}
            inputMode="decimal"
          />
        ) : (
          <span className={styles.editableGridValue}>{value || "\u00A0"}</span>
        )}
      </div>
    </td>
  );
}
