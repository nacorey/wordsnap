import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ScanInfo = { created_at: string; image_url: string };

export type VocabularyWithScan = {
  id: string;
  word: string;
  data: { collocations?: string[]; examples?: string[] };
  created_at: string;
  scans: ScanInfo | ScanInfo[] | null;
};

function getScan(item: VocabularyWithScan): ScanInfo | null {
  const s = item.scans;
  if (!s) return null;
  return Array.isArray(s) ? s[0] ?? null : s;
}

export function VocabularyCard({ item }: { item: VocabularyWithScan }) {
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
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-primary">
            {item.word}
          </CardTitle>
          {date && (
            <span className="text-xs text-muted-foreground">{date}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {collocations.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Collocations
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {collocations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {examples.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Examples
            </p>
            <ul className="space-y-1 text-sm text-foreground/90">
              {examples.map((e, i) => (
                <li key={i} className="border-l-2 border-primary/20 pl-2">
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
