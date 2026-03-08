/** 콜로케이션 한 개 (영어 표현 + 한글 의미) */
export type CollocationItem = {
  phrase: string;
  meaningKo: string;
};

export const ANALYZE_RESPONSE_SCHEMA = {
  words: [
    {
      word: "string (대상 단어)",
      collocations: [{ phrase: "string", meaningKo: "한글 의미" }],
      examples: ["string (자연스러운 예문 2개)"],
    },
  ],
} as const;

export type AnalyzeWordItem = {
  word: string;
  collocations: [CollocationItem, CollocationItem, CollocationItem];
  examples: [string, string];
};

export type AnalyzeResponse = {
  words: AnalyzeWordItem[];
};
