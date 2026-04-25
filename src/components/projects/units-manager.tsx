'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn, formatILS } from '@/lib/utils';
import {
  createUnitAction,
  updateUnitAction,
  deleteUnitAction,
  bulkCreateUnitsAction,
} from '@/app/actions/units';

interface Unit {
  id: string;
  unit_number: string;
  floor: number | null;
  rooms: number | null;
  area_sqm: number | null;
  price: number | null;
  price_per_sqm: number | null;
  status: 'available' | 'reserved' | 'sold' | 'unavailable';
  direction: string | null;
  notes: string | null;
}

interface Props {
  projectId: string;
  initialUnits: Unit[];
}

const STATUS_CONFIG: Record<
  Unit['status'],
  { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' }
> = {
  available: { label: 'זמין', variant: 'info' },
  reserved: { label: 'באופציה', variant: 'warning' },
  sold: { label: 'נמכר', variant: 'success' },
  unavailable: { label: 'לא זמין', variant: 'secondary' },
};

export function UnitsManager({ projectId, initialUnits }: Props) {
  const router = useRouter();
  const [units, setUnits] = React.useState(initialUnits);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showBulkAdd, setShowBulkAdd] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totals = React.useMemo(() => {
    const byStatus = units.reduce(
      (acc, u) => {
        acc[u.status] = (acc[u.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return {
      total: units.length,
      available: byStatus.available ?? 0,
      reserved: byStatus.reserved ?? 0,
      sold: byStatus.sold ?? 0,
      unavailable: byStatus.unavailable ?? 0,
    };
  }, [units]);

  const handleStatusChange = async (unitId: string, newStatus: Unit['status']) => {
    // Optimistic update
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, status: newStatus } : u)));

    const result = await updateUnitAction({ id: unitId, status: newStatus });
    if (!result.ok) {
      setError(result.error);
      // Revert on failure
      router.refresh();
    }
  };

  const handleDelete = async (unitId: string, unitNumber: string) => {
    if (!confirm(`למחוק יחידה ${unitNumber}?`)) return;

    const result = await deleteUnitAction(unitId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium">יחידות דיור</h3>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{totals.total}</span> סה"כ
              </span>
              <span>·</span>
              <span className="text-[hsl(var(--success))]">{totals.sold} נמכרו</span>
              <span>·</span>
              <span className="text-[hsl(var(--warning-foreground))]">{totals.reserved} באופציה</span>
              <span>·</span>
              <span>{totals.available} זמינות</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulkAdd(true)}>
              הוסף בכמות
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
              יחידה
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
            {error}
            <button onClick={() => setError(null)} className="mr-2 underline">סגור</button>
          </div>
        )}

        {units.length === 0 && !showAdd && !showBulkAdd ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary-50))]">
              <Home className="h-5 w-5 text-[hsl(var(--primary-600))]" />
            </div>
            <p className="text-sm font-medium mb-1">אין יחידות דיור עדיין</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              הוסף יחידות באופן ידני או צור בכמות - למשל 24 יחידות ממוספרות 1-24
            </p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowBulkAdd(true)}>
                צור בכמות
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                הוסף יחידה
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 text-right font-medium w-20">יחידה</th>
                  <th className="px-3 py-2.5 text-center font-medium w-16">קומה</th>
                  <th className="px-3 py-2.5 text-center font-medium w-20">חדרים</th>
                  <th className="px-3 py-2.5 text-right font-medium w-20">שטח</th>
                  <th className="px-3 py-2.5 text-right font-medium w-28">מחיר</th>
                  <th className="px-3 py-2.5 text-right font-medium w-24">למ"ר</th>
                  <th className="px-3 py-2.5 text-right font-medium w-28">סטטוס</th>
                  <th className="px-3 py-2.5 text-right font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {showAdd && (
                  <AddUnitRow
                    projectId={projectId}
                    onCancel={() => setShowAdd(false)}
                    onSuccess={(u) => {
                      setUnits((prev) => [...prev, u]);
                      setShowAdd(false);
                    }}
                    onError={setError}
                  />
                )}
                {showBulkAdd && (
                  <BulkAddRow
                    projectId={projectId}
                    onCancel={() => setShowBulkAdd(false)}
                    onSuccess={() => {
                      setShowBulkAdd(false);
                      router.refresh();
                    }}
                    onError={setError}
                  />
                )}
                {units.map((unit) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    isEditing={editingId === unit.id}
                    onEdit={() => setEditingId(unit.id)}
                    onCancel={() => setEditingId(null)}
                    onStatusChange={(status) => handleStatusChange(unit.id, status)}
                    onDelete={() => handleDelete(unit.id, unit.unit_number)}
                    onUpdate={(updated) => {
                      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                      setEditingId(null);
                    }}
                    onError={setError}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile: card list */}
        {units.length > 0 && (
          <div className="md:hidden divide-y">
            {units.map((unit) => (
              <div key={unit.id} className="px-4 py-3 hover:bg-accent/30">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">יחידה {unit.unit_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {unit.floor != null ? `קומה ${unit.floor}` : '—'}
                      {unit.rooms != null && ` · ${unit.rooms} חדרים`}
                      {unit.area_sqm != null && ` · ${unit.area_sqm} מ"ר`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
                      unit.status === 'sold' && 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-foreground))]',
                      unit.status === 'reserved' && 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-foreground))]',
                      unit.status === 'available' && 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-foreground))]',
                      unit.status === 'unavailable' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {unit.status === 'sold' ? 'נמכר' : unit.status === 'reserved' ? 'באופציה' : unit.status === 'available' ? 'זמין' : 'לא זמין'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2 pt-2 border-t">
                  <span className="text-sm font-semibold tabular-nums">
                    {unit.price != null ? formatILS(unit.price) : '—'}
                  </span>
                  {unit.price_per_sqm != null && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatILS(unit.price_per_sqm)}/מ"ר
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Unit row with inline edit
// ---------------------------------------------------------------------------

function UnitRow({
  unit,
  isEditing,
  onEdit,
  onCancel,
  onStatusChange,
  onDelete,
  onUpdate,
  onError,
}: {
  unit: Unit;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onStatusChange: (status: Unit['status']) => void;
  onDelete: () => void;
  onUpdate: (u: Unit) => void;
  onError: (msg: string) => void;
}) {
  const [draft, setDraft] = React.useState<Unit>(unit);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setDraft(unit), [unit, isEditing]);

  const save = async () => {
    setSaving(true);
    const result = await updateUnitAction({
      id: unit.id,
      floor: draft.floor ?? undefined,
      rooms: draft.rooms ?? undefined,
      area_sqm: draft.area_sqm ?? undefined,
      price: draft.price ?? undefined,
    });
    setSaving(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }
    const price_per_sqm =
      draft.price && draft.area_sqm ? Math.round(draft.price / draft.area_sqm) : null;
    onUpdate({ ...draft, price_per_sqm });
  };

  if (isEditing) {
    return (
      <tr className="border-b bg-[hsl(var(--primary-50))]/40">
        <td className="px-3 py-2 font-medium">{unit.unit_number}</td>
        <td className="px-2 py-2">
          <Input
            type="number"
            className="h-7 text-xs"
            value={draft.floor ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, floor: e.target.value ? Number(e.target.value) : null })
            }
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="0.5"
            className="h-7 text-xs"
            value={draft.rooms ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, rooms: e.target.value ? Number(e.target.value) : null })
            }
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            className="h-7 text-xs"
            value={draft.area_sqm ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, area_sqm: e.target.value ? Number(e.target.value) : null })
            }
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="10000"
            className="h-7 text-xs"
            value={draft.price ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, price: e.target.value ? Number(e.target.value) : null })
            }
          />
        </td>
        <td className="px-3 py-2 text-muted-foreground text-xs">
          {draft.price && draft.area_sqm
            ? formatILS(Math.round(draft.price / draft.area_sqm))
            : '—'}
        </td>
        <td className="px-3 py-2">
          <Badge variant={STATUS_CONFIG[unit.status].variant}>
            {STATUS_CONFIG[unit.status].label}
          </Badge>
        </td>
        <td className="px-2 py-2">
          <div className="flex gap-1">
            <button
              onClick={save}
              disabled={saving}
              className="rounded p-1 text-[hsl(var(--success))] hover:bg-[hsl(var(--success-bg))]"
              aria-label="שמור"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="בטל"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
      <td className="px-3 py-2.5 font-medium">{unit.unit_number}</td>
      <td className="px-3 py-2.5 text-center text-muted-foreground">{unit.floor ?? '—'}</td>
      <td className="px-3 py-2.5 text-center">{unit.rooms ?? '—'}</td>
      <td className="px-3 py-2.5 tabular-nums">
        {unit.area_sqm ? `${unit.area_sqm} מ"ר` : '—'}
      </td>
      <td className="px-3 py-2.5 tabular-nums font-medium">
        {unit.price != null ? formatILS(unit.price) : '—'}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-muted-foreground text-xs">
        {unit.price_per_sqm != null ? formatILS(unit.price_per_sqm) : '—'}
      </td>
      <td className="px-3 py-2.5">
        <Select value={unit.status} onValueChange={(v) => onStatusChange(v as Unit['status'])}>
          <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs hover:bg-accent">
            <SelectValue>
              <Badge variant={STATUS_CONFIG[unit.status].variant}>
                {STATUS_CONFIG[unit.status].label}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">זמין</SelectItem>
            <SelectItem value="reserved">באופציה</SelectItem>
            <SelectItem value="sold">נמכר</SelectItem>
            <SelectItem value="unavailable">לא זמין</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="ערוך"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--destructive-bg))] hover:text-[hsl(var(--destructive))]"
            aria-label="מחק"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Add single unit row
// ---------------------------------------------------------------------------

function AddUnitRow({
  projectId,
  onCancel,
  onSuccess,
  onError,
}: {
  projectId: string;
  onCancel: () => void;
  onSuccess: (u: Unit) => void;
  onError: (msg: string) => void;
}) {
  const [unitNumber, setUnitNumber] = React.useState('');
  const [floor, setFloor] = React.useState('');
  const [rooms, setRooms] = React.useState('');
  const [area, setArea] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!unitNumber.trim()) {
      onError('מספר יחידה חובה');
      return;
    }
    setSaving(true);
    const result = await createUnitAction({
      project_id: projectId,
      unit_number: unitNumber.trim(),
      floor: floor ? Number(floor) : null,
      rooms: rooms ? Number(rooms) : null,
      area_sqm: area ? Number(area) : null,
      price: price ? Number(price) : null,
      parking_spots: 0,
      storage_units: 0,
      status: 'available',
    });
    setSaving(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onSuccess({
      id: result.data.id,
      unit_number: unitNumber.trim(),
      floor: floor ? Number(floor) : null,
      rooms: rooms ? Number(rooms) : null,
      area_sqm: area ? Number(area) : null,
      price: price ? Number(price) : null,
      price_per_sqm: price && area ? Math.round(Number(price) / Number(area)) : null,
      status: 'available',
      direction: null,
      notes: null,
    });
  };

  return (
    <tr className="border-b bg-[hsl(var(--primary-50))]/60">
      <td className="px-2 py-2">
        <Input
          placeholder="A1"
          className="h-7 text-xs"
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          autoFocus
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          placeholder="1"
          className="h-7 text-xs"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          step="0.5"
          placeholder="4"
          className="h-7 text-xs"
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          placeholder="95"
          className="h-7 text-xs"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </td>
      <td className="px-2 py-2" colSpan={2}>
        <Input
          type="number"
          step="10000"
          placeholder="3500000"
          className="h-7 text-xs"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">זמין</td>
      <td className="px-2 py-2">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={saving || !unitNumber.trim()}
            className="rounded p-1 text-[hsl(var(--success))] hover:bg-[hsl(var(--success-bg))] disabled:opacity-50"
            aria-label="שמור"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="בטל"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Bulk add row
// ---------------------------------------------------------------------------

function BulkAddRow({
  projectId,
  onCancel,
  onSuccess,
  onError,
}: {
  projectId: string;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [count, setCount] = React.useState('10');
  const [startFrom, setStartFrom] = React.useState('1');
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    const result = await bulkCreateUnitsAction(projectId, Number(count), Number(startFrom));
    setSaving(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess();
  };

  return (
    <tr className="border-b bg-[hsl(var(--info-bg))]/40">
      <td colSpan={8} className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium">צור</span>
          <Input
            type="number"
            min="1"
            max="500"
            className="h-7 w-20 text-xs"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            autoFocus
          />
          <span className="text-xs">יחידות, החל מ-</span>
          <Input
            type="number"
            min="1"
            className="h-7 w-20 text-xs"
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            (יחידות {startFrom} עד {Number(startFrom) + Number(count) - 1})
          </span>
          <div className="mr-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
              ביטול
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !count || !startFrom}>
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור'
              )}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
