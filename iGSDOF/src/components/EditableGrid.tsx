import {
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import styles from "./EditableGrid.module.css";

type ColumnParser = (value: string) => number | null;

export type ColumnConfig<K extends string> = {
  key: K;
  label: string;
  placeholder?: string;
  parser?: ColumnParser;
  align?: "left" | "center" | "right";
  width?: number | string;
};

export type EditableGridRow<K extends string> = {
  id: number | string;
} & Record<K, string>;

export type ParsedRow<K extends string> = Record<K, number>;

type EditableGridProps<K extends string, TRow extends EditableGridRow<K>> = {
  title: string;
  columns: ColumnConfig<K>[];
  rows: TRow[];
  onRowsChange: Dispatch<SetStateAction<TRow[]>>;
  createRow: () => TRow;
  onValidatedRows?: (rows: ParsedRow<K>[]) => void;
  toolbar?: ReactNode;
  maxHeight?: number;
};

type CellPosition = { row: number; col: number };

type EditingCell = {
  row: number;
  col: number;
  originalValue: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function makeCellKey(position: CellPosition): string {
  return `${position.row}:${position.col}`;
}

function classNames(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function EditableGrid<
  K extends string,
  TRow extends EditableGridRow<K>,
>({
  title,
  columns,
  rows,
  onRowsChange,
  createRow,
  onValidatedRows,
  toolbar,
}: EditableGridProps<K, TRow>) {
  const [activeCell, setActiveCell] = useState<CellPosition | null>(() => {
    if (rows.length === 0 || columns.length === 0) {
      return null;
    }
    return { row: 0, col: 0 };
  });
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editingInputRef = useRef<HTMLInputElement | null>(null);

  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerCell = useCallback(
    (position: CellPosition, node: HTMLDivElement | null) => {
      const key = makeCellKey(position);
      if (node) {
        cellRefs.current.set(key, node);
      } else {
        cellRefs.current.delete(key);
      }
    },
    []
  );

  const focusCell = useCallback((position: CellPosition | null) => {
    if (!position) {
      return;
    }
    const key = makeCellKey(position);
    const node = cellRefs.current.get(key);
    if (node) {
      node.focus({ preventScroll: false });
    }
  }, []);

  const ensureActiveCellInBounds = useCallback(
    (position: CellPosition | null): CellPosition | null => {
      if (!position || rows.length === 0 || columns.length === 0) {
        return rows.length && columns.length ? { row: 0, col: 0 } : null;
      }
      const nextRow = clamp(position.row, 0, rows.length - 1);
      const nextCol = clamp(position.col, 0, columns.length - 1);
      return { row: nextRow, col: nextCol };
    },
    [rows.length, columns.length]
  );

  const appendRow = useCallback(
    (selectColumn = 0) => {
      const nextRow = createRow();
      onRowsChange((prev) => [...prev, nextRow]);
      if (columns.length > 0) {
        setActiveCell({
          row: rows.length,
          col: clamp(selectColumn, 0, columns.length - 1),
        });
      }
      setEditingCell(null);
    },
    [createRow, onRowsChange, rows, columns.length]
  );

  const updateCellValue = useCallback(
    (rowIndex: number, columnKey: K, nextValue: string) => {
      onRowsChange((prev) =>
        prev.map((row, index) =>
          index === rowIndex ? { ...row, [columnKey]: nextValue } : row
        )
      );
    },
    [onRowsChange]
  );

  const moveSelection = useCallback(
    (deltaRow: number, deltaCol: number) => {
      setActiveCell((current) => {
        if (!current) {
          return rows.length && columns.length ? { row: 0, col: 0 } : null;
        }
        const nextRow = clamp(
          current.row + deltaRow,
          0,
          Math.max(rows.length - 1, 0)
        );
        const nextCol = clamp(
          current.col + deltaCol,
          0,
          Math.max(columns.length - 1, 0)
        );
        return { row: nextRow, col: nextCol };
      });
      setEditingCell(null);
    },
    [rows.length, columns.length]
  );

  const moveTo = useCallback(
    (row: number, col: number) => {
      setActiveCell({
        row: clamp(row, 0, Math.max(rows.length - 1, 0)),
        col: clamp(col, 0, Math.max(columns.length - 1, 0)),
      });
      setEditingCell(null);
    },
    [rows.length, columns.length]
  );

  const startEditing = useCallback(
    (position: CellPosition, overwriteValue?: string) => {
      const column = columns[position.col];
      const row = rows[position.row];
      if (!column || !row) {
        return;
      }
      setActiveCell(position);
      const originalValue = row[column.key] ?? "";
      if (overwriteValue !== undefined) {
        const nextValue = overwriteValue === null ? "" : overwriteValue;
        updateCellValue(position.row, column.key, nextValue);
      }
      setEditingCell({
        row: position.row,
        col: position.col,
        originalValue,
      });
    },
    [columns, rows, updateCellValue]
  );

  const finishEditing = useCallback(
    (movement?: { rowDelta?: number; colDelta?: number }) => {
      setEditingCell(null);
      if (!movement) {
        return;
      }
      setActiveCell((current) => {
        if (!current) {
          if (!rows.length || !columns.length) {
            return null;
          }
          return { row: 0, col: 0 };
        }
        const nextRow = clamp(
          current.row + (movement.rowDelta ?? 0),
          0,
          Math.max(rows.length - 1, 0)
        );
        const nextCol = clamp(
          current.col + (movement.colDelta ?? 0),
          0,
          Math.max(columns.length - 1, 0)
        );
        return { row: nextRow, col: nextCol };
      });
    },
    [rows.length, columns.length]
  );

  const cancelEditing = useCallback(() => {
    setEditingCell((current) => {
      if (!current) {
        return null;
      }
      const column = columns[current.col];
      if (column) {
        updateCellValue(current.row, column.key, current.originalValue);
      }
      return null;
    });
  }, [columns, updateCellValue]);

  useEffect(() => {
    if (!onValidatedRows) {
      return;
    }
    const parsedRows: ParsedRow<K>[] = [];
    rowLoop: for (const row of rows) {
      const parsedRow = {} as ParsedRow<K>;
      for (const column of columns) {
        const rawValue = (row[column.key] ?? "").trim();
        if (!rawValue) {
          continue rowLoop;
        }
        const parser =
          column.parser ??
          ((value: string) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          });
        const parsedValue = parser(rawValue);
        if (parsedValue === null || !Number.isFinite(parsedValue)) {
          continue rowLoop;
        }
        parsedRow[column.key] = parsedValue;
      }
      parsedRows.push(parsedRow);
    }
    onValidatedRows(parsedRows);
  }, [rows, columns, onValidatedRows]);

  useLayoutEffect(() => {
    setActiveCell((current) => ensureActiveCellInBounds(current));
  }, [ensureActiveCellInBounds, rows.length, columns.length]);

  useLayoutEffect(() => {
    if (editingCell) {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    } else {
      focusCell(activeCell);
    }
  }, [activeCell, editingCell, focusCell]);

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.target as Node)) {
      return;
    }
    if (!activeCell && rows.length && columns.length) {
      setActiveCell({ row: 0, col: 0 });
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      moveSelection(10, 0);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      moveSelection(-10, 0);
    } else if (event.key === "Insert" && event.ctrlKey) {
      event.preventDefault();
      appendRow(0);
    }
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    position: CellPosition
  ) => {
    const column = columns[position.col];
    if (!column) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1, 0);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (position.row === rows.length - 1 && event.ctrlKey) {
        appendRow(position.col);
        return;
      }
      moveSelection(1, 0);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(0, 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveTo(position.row, 0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      moveTo(position.row, columns.length - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      startEditing(position);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      startEditing(position);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        if (position.col === 0) {
          if (position.row > 0) {
            moveTo(position.row - 1, columns.length - 1);
          }
        } else {
          moveSelection(0, -1);
        }
      } else if (position.col === columns.length - 1) {
        if (position.row === rows.length - 1) {
          appendRow(0);
        } else {
          moveTo(position.row + 1, 0);
        }
      } else {
        moveSelection(0, 1);
      }
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      updateCellValue(position.row, column.key, "");
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      startEditing(position, event.key);
    }
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    position: CellPosition
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEditing({ rowDelta: event.shiftKey ? -1 : 1 });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        finishEditing();
        if (position.col === 0) {
          if (position.row > 0) {
            moveTo(position.row - 1, columns.length - 1);
          }
        } else {
          moveSelection(0, -1);
        }
      } else if (position.col === columns.length - 1) {
        finishEditing();
        if (position.row === rows.length - 1) {
          appendRow(0);
        } else {
          moveTo(position.row + 1, 0);
        }
      } else {
        finishEditing();
        moveSelection(0, 1);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }
    if (event.key === "ArrowUp" && event.ctrlKey) {
      event.preventDefault();
      finishEditing({ rowDelta: -1 });
      return;
    }
    if (event.key === "ArrowDown" && event.ctrlKey) {
      event.preventDefault();
      finishEditing({ rowDelta: 1 });
    }
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    position: CellPosition
  ) => {
    const column = columns[position.col];
    if (!column) {
      return;
    }
    updateCellValue(position.row, column.key, event.target.value);
  };

  const handleInputBlur = () => {
    finishEditing();
  };

  const renderCell = (rowIndex: number, colIndex: number) => {
    const column = columns[colIndex];
    if (!column) {
      return null;
    }
    const position = { row: rowIndex, col: colIndex };
    const isActive =
      activeCell?.row === rowIndex && activeCell.col === colIndex;
    const isEditing =
      editingCell?.row === rowIndex && editingCell.col === colIndex;
    const row = rows[rowIndex];
    const rawValue = row[column.key] ?? "";

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
          ref={(node) => registerCell(position, node)}
          className={classNames(
            styles.editableGridCell,
            isActive && styles.isActive,
            isEditing && styles.isEditing,
            column.align === "right" && styles.alignRight,
            column.align === "center" && styles.alignCenter
          )}
          onClick={() => {
            setActiveCell(position);
            setEditingCell(null);
          }}
          onDoubleClick={() => startEditing(position)}
          onKeyDown={(event) => handleCellKeyDown(event, position)}
        >
          {isEditing ? (
            <input
              ref={editingInputRef}
              value={rawValue}
              onChange={(event) => handleInputChange(event, position)}
              onKeyDown={(event) => handleInputKeyDown(event, position)}
              onBlur={handleInputBlur}
              className={styles.editableGridInput}
              placeholder={column.placeholder}
              inputMode="decimal"
            />
          ) : (
            <span className={styles.editableGridValue}>
              {rawValue || "\u00A0"}
            </span>
          )}
        </div>
      </td>
    );
  };

  return (
    <section
      className={styles.editableGrid}
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
    >
      <header className={styles.editableGridHeader}>
        <div className={styles.editableGridTitle}>
          <h3>{title}</h3>
          <p>
            {rows.length} row{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {toolbar ? (
          <div className={styles.editableGridActions}>{toolbar}</div>
        ) : <div></div>}
      </header>
      <div className={styles.editableGridTable} >
        {rows.length === 0 ? (
          <div className={styles.editableGridEmptyState}>
            <p>No rows yet. Use the toolbar to add a new row.</p>
            <button
              type="button"
            >
              + Add first row
            </button>
          </div>
        ) : (
          <table role="grid">
            <thead>
              <tr>
                <th className={styles.editableGridRowHeader} />
                {columns.map((column) => (
                  <th key={column.key} style={{ width: column.width }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const isActiveRow = activeCell?.row === rowIndex;
                return (
                  <tr
                    key={row.id}
                    className={classNames(
                      styles.editableGridRow,
                      isActiveRow && styles.isActiveRow
                    )}
                  >
                    <th className={styles.editableGridRowHeader}>
                      {rowIndex + 1}
                    </th>
                    {columns.map((_, colIndex) =>
                      renderCell(rowIndex, colIndex)
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
