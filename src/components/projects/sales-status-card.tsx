import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Props {
  total: number;
  sold: number;
  reserved: number;
  available: number;
}

export function SalesStatusCard({ total, sold, reserved, available }: Props) {
  const soldPct = total > 0 ? (sold / total) * 100 : 0;
  const reservedPct = total > 0 ? (reserved / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>סטטוס מכירות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-semibold">{sold}</span>
            <span className="text-lg text-muted-foreground">/{total || '—'}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {total > 0 ? `${Math.round(soldPct)}% מכירות` : 'טרם הוגדרו יחידות'}
          </p>
        </div>

        {total > 0 && (
          <div className="h-2 rounded-full bg-muted overflow-hidden flex mb-3">
            <div
              className="bg-[hsl(var(--success))] transition-all"
              style={{ width: `${soldPct}%` }}
            />
            <div
              className="bg-[hsl(var(--warning))] transition-all"
              style={{ width: `${reservedPct}%` }}
            />
          </div>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              <span>נמכרו</span>
            </div>
            <span className="font-medium">{sold}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--warning))]" />
              <span>באופציה</span>
            </div>
            <span className="font-medium">{reserved}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-border-strong" />
              <span>זמינות</span>
            </div>
            <span className="font-medium">{available}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
