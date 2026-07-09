import { useCallback, useRef, useState } from "react";
import type { OscMeta } from "@/lib/osc";
import { completionSuffix } from "@/lib/osc";

export interface FishCompletionState {
  prefix: string;
  candidates: string[];
  selectedIndex: number;
  open: boolean;
}

const EMPTY: FishCompletionState = {
  prefix: "",
  candidates: [],
  selectedIndex: 0,
  open: false,
};

export function useFishCompletions() {
  const [state, setState] = useState<FishCompletionState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyMeta = useCallback((meta: OscMeta) => {
    if (meta.completions === undefined) return;
    setState({
      prefix: meta.completionPrefix ?? "",
      candidates: meta.completions,
      selectedIndex: 0,
      open: meta.completions.length > 0,
    });
  }, []);

  const clear = useCallback(() => {
    setState(EMPTY);
  }, []);

  const selectNext = useCallback(() => {
    setState((s) => {
      if (s.candidates.length === 0) return s;
      return {
        ...s,
        selectedIndex: (s.selectedIndex + 1) % s.candidates.length,
      };
    });
  }, []);

  const selectPrev = useCallback(() => {
    setState((s) => {
      if (s.candidates.length === 0) return s;
      return {
        ...s,
        selectedIndex:
          (s.selectedIndex - 1 + s.candidates.length) % s.candidates.length,
      };
    });
  }, []);

  const acceptSelected = useCallback(
    async (write: (data: string) => Promise<void>) => {
      const { candidates, selectedIndex, prefix } = stateRef.current;
      const candidate = candidates[selectedIndex];
      if (!candidate) return;
      const suffix = completionSuffix(prefix, candidate);
      await write(suffix);
      setState(EMPTY);
    },
    [],
  );

  const acceptAtIndex = useCallback(
    async (index: number, write: (data: string) => Promise<void>) => {
      const { candidates, prefix } = stateRef.current;
      const candidate = candidates[index];
      if (!candidate) return;
      const suffix = completionSuffix(prefix, candidate);
      await write(suffix);
      setState(EMPTY);
    },
    [],
  );

  return {
    ...state,
    stateRef,
    applyMeta,
    clear,
    selectNext,
    selectPrev,
    acceptSelected,
    acceptAtIndex,
  };
}
