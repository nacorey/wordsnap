import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ScanInfo = { created_at: string; image_url: string };

/** 콜로케이션: 레거시 문자열 또는 { phrase, meaningKo } */
export type CollocationDisplay =
  | string
  | { phrase: string; meaningKo?: string };

export type VocabularyWithScan = {
  id: string;
  word: string;
  data: {
    collocations?: CollocationDisplay[];
    examples?: string[];
  };
  created_at: string;
  scans: ScanInfo | ScanInfo[] | null;
};

function getScan(item: VocabularyWithScan): ScanInfo | null {
  const s = item.scans;
  if (!s) return null;
  return Array.isArray(s) ? s[0] ?? null : s;
}

export function VocabularyCard({
  item,
  selected,
  onToggle,
}: {
  item: VocabularyWithScan;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const collocations = item.data?.collocations ?? [];
  const examples = item.data?.examples ?? [];
  const scan = getScan(item);
  const date = scan?.created_at
    ? new Date(scan.created_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card
      className={`group overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-primary/5 ${
        selected
          ? "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20"
          : "border-border/60 hover:border-primary/30"
      } ${onToggle ? "cursor-pointer" : ""}`}
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          {onToggle && (
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              {selected && (
                <svg className="size-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )}
          <CardTitle className="flex-1 text-lg font-bold text-primary">
            {item.word}
          </CardTitle>
          {date && (
            <span className="shrink-0 text-[11px] text-muted-foreground">{date}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {collocations.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Collocations
            </p>
            <div className="space-y-1">
              {collocations.map((c, i) => (
                <CollocationRow key={i} collocation={c} />
              ))}
            </div>
          </div>
        )}
        {examples.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Examples
            </p>
            <ul className="space-y-1.5">
              {examples.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-foreground/85"
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollocationRow({ collocation }: { collocation: CollocationDisplay }) {
  if (typeof collocation === "string") {
    return (
      <div className="rounded-md bg-primary/[0.06] px-2.5 py-1.5 text-sm">
        {collocation}
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-2 rounded-md bg-primary/[0.06] px-2.5 py-1.5 text-sm">
      <span className="font-medium text-foreground">{collocation.phrase}</span>
      {collocation.meaningKo && (
        <span className="text-xs text-muted-foreground">{collocation.meaningKo}</span>
      )}
    </div>
  );
}
