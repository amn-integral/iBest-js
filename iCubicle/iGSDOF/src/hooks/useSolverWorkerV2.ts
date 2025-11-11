import { useCallback, useRef } from "react";
import type {
  SolverWorkerInputV2,
  SolverWorkerOutputV2,
  SolverWorkerErrorV2,
} from "../types";

export function useSolverWorkerV2() {
  const workerRef = useRef<Worker | null>(null);

  const runSolver = useCallback(
    (input: SolverWorkerInputV2): Promise<SolverWorkerOutputV2> => {
      return new Promise((resolve, reject) => {
        // Create worker if it doesn't exist
        if (!workerRef.current) {
          console.log('[useSolverWorkerV2] Creating new worker...');
          workerRef.current = new Worker(
            new URL("../workers/solverWorkerV2.ts", import.meta.url),
            { type: "module" }
          );
        }

        const worker = workerRef.current;

        // Set up message handler
        const handleMessage = (
          e: MessageEvent<SolverWorkerOutputV2 | SolverWorkerErrorV2>
        ) => {
          console.log('[useSolverWorkerV2] Received message from worker:', e.data);
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);

          const result = e.data;
          if (result.success) {
            console.log('[useSolverWorkerV2] Solver completed successfully');
            resolve(result);
          } else {
            console.error('[useSolverWorkerV2] Solver failed:', result.error);
            reject(new Error(result.error));
          }
        };

        const handleError = (error: ErrorEvent) => {
          console.error('[useSolverWorkerV2] Worker error:', error);
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          reject(new Error(`Worker error: ${error.message}`));
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);

        // Send data to worker
        console.log('[useSolverWorkerV2] Sending data to worker:', input);
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
