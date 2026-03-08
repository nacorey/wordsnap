export const ANALYZE_RESPONSE_SCHEMA = {
  words: [
    {
      word: "string (대상 단어)",
      collocations: ["string (단어와 자주 쓰이는 표현 3개)"],
      examples: ["string (자연스러운 예문 2개)"],
    },
  ],
} as const;

export type AnalyzeWordItem = {
  word: string;
  collocations: [string, string, string];
  examples: [string, string];
};

export type AnalyzeResponse = {
  words: AnalyzeWordItem[];
};
