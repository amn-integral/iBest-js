import { useCallback, useRef } from "react";
import type {
  SolverWorkerInput,
  SolverWorkerOutput,
  SolverWorkerError,
} from "../workers/solverWorker";

export function useSolverWorker() {
  const workerRef = useRef<Worker | null>(null);

  const runSolver = useCallback(
    (input: SolverWorkerInput): Promise<SolverWorkerOutput> => {
      return new Promise((resolve, reject) => {
        // Create worker if it doesn't exist
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL("../workers/solverWorker.ts", import.meta.url),
            { type: "module" }
          );
        }

        const worker = workerRef.current;

        // Set up message handler
        const handleMessage = (
          e: MessageEvent<SolverWorkerOutput | SolverWorkerError>
        ) => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);

          const result = e.data;
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error));
          }
        };

        const handleError = (error: ErrorEvent) => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          reject(new Error(`Worker error: ${error.message}`));
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);

        // Send data to worker
        worker.postMessage(input);
      });
    },
    []
  );

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { runSolver, terminateWorker };
}
