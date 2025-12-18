/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    gc?: () => void;

    iGSDOFState?: {
      getCurrentState: () => {
        inputs: {
          title: unknown;
          mass: unknown;
          rotationLength: unknown;
          orientation: unknown;
          resistance: unknown;
          displacement: unknown;
          klm: unknown;
          u0: unknown;
          v0: unknown;
          force: unknown;
          time: unknown;
          unitSystem: unknown;
        };
        summary: unknown;
        url: string;
        timestamp: number;
      };
    };
  }
}
