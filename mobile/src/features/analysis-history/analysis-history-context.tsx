import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import type { AnalysisRecord } from '@/lib/api';

type AnalysisHistoryContextValue = {
  analyses: AnalysisRecord[];
  addAnalysis: (analysis: AnalysisRecord) => void;
  latestAnalysis: AnalysisRecord | null;
};

const AnalysisHistoryContext = createContext<AnalysisHistoryContextValue | null>(null);

export function AnalysisHistoryProvider({ children }: PropsWithChildren) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);

  const value = useMemo<AnalysisHistoryContextValue>(
    () => ({
      analyses,
      latestAnalysis: analyses[0] ?? null,
      addAnalysis: (analysis) => {
        setAnalyses((current) => [
          analysis,
          ...current.filter((item) => item.id !== analysis.id),
        ]);
      },
    }),
    [analyses],
  );

  return (
    <AnalysisHistoryContext.Provider value={value}>
      {children}
    </AnalysisHistoryContext.Provider>
  );
}

export function useAnalysisHistory() {
  const context = useContext(AnalysisHistoryContext);

  if (!context) {
    throw new Error('useAnalysisHistory must be used inside AnalysisHistoryProvider');
  }

  return context;
}
