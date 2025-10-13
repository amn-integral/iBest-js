import { useCallback, useMemo, useRef, useState } from "react";

import {
  EditableGrid,
  type ColumnConfig,
  type EditableGridRow,
  type ParsedRow,
} from "../components/EditableGrid";

type DemoColumnKey = "time" | "force" | "velocity";

type DemoRow = EditableGridRow<DemoColumnKey>;

type DemoParsedRow = ParsedRow<DemoColumnKey>;

const COLUMN_DEFINITIONS: ColumnConfig<DemoColumnKey>[] = [
  {
    key: "time",
    label: "Time (s)",
    placeholder: "0.00",
    parser: (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    },
  },
  {
    key: "force",
    label: "Force (kip)",
    placeholder: "0.00",
    parser: (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
  },
  {
    key: "velocity",
    label: "Velocity (in/s)",
    placeholder: "0.00",
    parser: (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
  },
];

const INITIAL_ROWS: Omit<DemoRow, "id">[] = [
  { time: "0.00", force: "0.0", velocity: "0.0" },
  { time: "0.10", force: "3.5", velocity: "0.2" },
  { time: "0.20", force: "7.2", velocity: "0.6" },
];

export function EditableGridPlayground() {
  const [rows, setRows] = useState<DemoRow[]>(() =>
    INITIAL_ROWS.map((row, index) => ({
      ...row,
      id: index + 1,
    })),
  );
  const [validated, setValidated] = useState<DemoParsedRow[]>([]);

  const nextRowIdRef = useRef(INITIAL_ROWS.length + 1);

  const createRow = useCallback((): DemoRow => {
    const id = nextRowIdRef.current++;
    return {
      id,
      time: "",
      force: "",
      velocity: "",
    };
  }, []);

  const toolbar = useMemo(
    () => (
      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          setRows((prev) => [...prev, createRow()])
        }
      >
        + Add row
      </button>
    ),
    [createRow],
  );

  return (
    <div className="grid-playground">
      <header className="grid-playground__header">
        <h1>Editable Grid Playground</h1>
        <p>
          Navigate with arrow keys, tab between cells, and press Enter or F2 to
          edit. Type directly to overwrite a cell, or use Ctrl+Insert to add a
          new row.
        </p>
      </header>

      <EditableGrid
        title="Force Time History"
        columns={COLUMN_DEFINITIONS}
        rows={rows}
        onRowsChange={setRows}
        createRow={createRow}
        onValidatedRows={setValidated}
        toolbar={toolbar}
        maxHeight={320}
      />

      <aside className="grid-playground__summary">
        <h2>Validated Rows</h2>
        {validated.length === 0 ? (
          <p>No complete rows yet.</p>
        ) : (
          <pre>{JSON.stringify(validated, null, 2)}</pre>
        )}
      </aside>
    </div>
  );
}
