// src/context/AnalysisContext.tsx
import { createContext, useState, useContext, ReactNode } from 'react';

// 분석 결과의 타입을 정의합니다. VideoAnalysisTest 컴포넌트의 상태를 기반으로 추정합니다.
// 실제 타입은 더 복잡할 수 있으므로, 우선 any로 두고 나중에 구체화합니다.
type AnalysisResult = any;

interface AnalysisContextType {
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
}

// Context를 생성합니다.
const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// Context Provider 컴포넌트를 정의합니다.
export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const value = { analysisResult, setAnalysisResult };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

// Context를 쉽게 사용할 수 있도록 커스텀 훅을 만듭니다.
export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
