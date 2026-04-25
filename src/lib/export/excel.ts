import * as XLSX from 'xlsx';
import type { AnalyticsRow, AnalyticsStats, AnalyticsFilters } from '@/app/actions/analytics';

/**
 * Excel export using xlsx (SheetJS).
 *
 * Produces a workbook with 3 sheets:
 *   1. "נתונים" - raw data rows
 *   2. "סיכום" - aggregate stats
 *   3. "סינון" - record of what filters were applied
 *
 * Uses aoa_to_sheet (array-of-arrays) instead of json_to_sheet because
 * we need full control over column order, widths, and header labels in Hebrew.
 */

const SOURCE_LABELS: Record<string, string> = {
  yad2: 'יד2',
  madlan: 'מדלן',
  tax_authority: 'רשות המיסים',
  manual: 'ידני',
  other: 'אחר',
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: 'מכירה',
  rent: 'השכרה',
  transaction: 'עסקה',
};

export interface ExportMeta {
  filters: AnalyticsFilters;
  stats: AnalyticsStats;
  generatedAt: Date;
  generatedBy: string;
}

export function buildWorkbook(rows: AnalyticsRow[], meta: ExportMeta): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data
  const dataSheet = buildDataSheet(rows);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'נתונים');

  // Sheet 2: Summary stats
  const summarySheet = buildSummarySheet(meta.stats, rows.length);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'סיכום');

  // Sheet 3: Applied filters
  const filtersSheet = buildFiltersSheet(meta);
  XLSX.utils.book_append_sheet(workbook, filtersSheet, 'סינון');

  // Set workbook properties
  if (!workbook.Props) workbook.Props = {};
  workbook.Props.Title = 'דוח ניתוח שוק נדל"ן';
  workbook.Props.Author = meta.generatedBy;
  workbook.Props.CreatedDate = meta.generatedAt;

  // Set RTL on all sheets
  workbook.Workbook = workbook.Workbook ?? {};
  workbook.Workbook.Views = [{ RTL: true }];

  return workbook;
}

function buildDataSheet(rows: AnalyticsRow[]): XLSX.WorkSheet {
  const headers = [
    'עיר',
    'שכונה',
    'רחוב',
    'סוג נכס',
    'חדרים',
    'שטח (מ"ר)',
    'קומה',
    'שנת בנייה',
    'מחיר (₪)',
    'מחיר למ"ר (₪)',
    'סוג עסקה',
    'תאריך עסקה',
    'תאריך פרסום',
    'מקור',
    'קישור',
  ];

  const data: (string | number | Date | null)[][] = [
    headers,
    ...rows.map((r) => [
      r.city,
      r.neighborhood,
      r.street,
      r.property_type,
      r.rooms,
      r.area_sqm,
      r.floor,
      r.year_built,
      r.price,
      r.price_per_sqm,
      LISTING_TYPE_LABELS[r.listing_type] ?? r.listing_type,
      r.transaction_date ? new Date(r.transaction_date) : null,
      r.listed_at ? new Date(r.listed_at) : null,
      SOURCE_LABELS[r.source] ?? r.source,
      r.source_url,
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true });

  // Column widths (in "characters")
  sheet['!cols'] = [
    { wch: 14 }, // עיר
    { wch: 16 }, // שכונה
    { wch: 18 }, // רחוב
    { wch: 14 }, // סוג נכס
    { wch: 8 }, // חדרים
    { wch: 10 }, // שטח
    { wch: 8 }, // קומה
    { wch: 10 }, // שנת בנייה
    { wch: 14 }, // מחיר
    { wch: 14 }, // מחיר למ"ר
    { wch: 10 }, // סוג עסקה
    { wch: 12 }, // תאריך עסקה
    { wch: 12 }, // תאריך פרסום
    { wch: 14 }, // מקור
    { wch: 40 }, // קישור
  ];

  // Freeze header row
  sheet['!freeze'] = { ySplit: 1 };
  sheet['!views'] = [{ RTL: true, state: 'frozen', ySplit: 1 }];

  // Apply cell formats
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  for (let row = 1; row <= range.e.r; row++) {
    // Price columns (I=8, J=9) - currency format
    for (const col of [8, 9]) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (cell && typeof cell.v === 'number') {
        cell.z = '#,##0" ₪"';
      }
    }
    // Date columns (L=11, M=12)
    for (const col of [11, 12]) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (cell && cell.v instanceof Date) {
        cell.t = 'd';
        cell.z = 'yyyy-mm-dd';
      }
    }
    // Number format for rooms/area
    for (const col of [4, 5]) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (cell && typeof cell.v === 'number') {
        cell.z = '#,##0.0';
      }
    }
  }

  return sheet;
}

function buildSummarySheet(stats: AnalyticsStats, exportedCount: number): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [
    ['סיכום סטטיסטי', ''],
    ['', ''],
    ['סה"כ רשומות תואמות', stats.totalCount],
    ['רשומות בייצוא', exportedCount],
    ['', ''],
    ['מחיר ממוצע (₪)', stats.avgPrice ? Math.round(stats.avgPrice) : null],
    ['מחיר חציוני (₪)', stats.medianPrice ? Math.round(stats.medianPrice) : null],
    ['מחיר ממוצע למ"ר (₪)', stats.avgPricePerSqm ? Math.round(stats.avgPricePerSqm) : null],
    ['', ''],
    ['שטח ממוצע (מ"ר)', stats.avgAreaSqm ? Math.round(stats.avgAreaSqm * 10) / 10 : null],
    ['חדרים ממוצע', stats.avgRooms ? Math.round(stats.avgRooms * 10) / 10 : null],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [{ wch: 28 }, { wch: 18 }];
  sheet['!views'] = [{ RTL: true }];

  // Format price cells (rows 5, 6, 7 = indices; column 1 = B)
  for (const rowIndex of [5, 6, 7]) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
    const cell = sheet[cellRef];
    if (cell && typeof cell.v === 'number') {
      cell.z = '#,##0" ₪"';
    }
  }

  return sheet;
}

function buildFiltersSheet(meta: ExportMeta): XLSX.WorkSheet {
  const { filters, generatedAt, generatedBy } = meta;

  const filterDescriptions: [string, string][] = [];

  if (filters.city) filterDescriptions.push(['עיר', filters.city]);
  if (filters.neighborhood) filterDescriptions.push(['שכונה', filters.neighborhood]);
  if (filters.source !== 'all') filterDescriptions.push(['מקור', SOURCE_LABELS[filters.source] ?? filters.source]);
  if (filters.listingType !== 'all')
    filterDescriptions.push(['סוג עסקה', LISTING_TYPE_LABELS[filters.listingType] ?? filters.listingType]);
  if (filters.minPrice != null)
    filterDescriptions.push(['מחיר מינימום', filters.minPrice.toLocaleString('he-IL') + ' ₪']);
  if (filters.maxPrice != null)
    filterDescriptions.push(['מחיר מקסימום', filters.maxPrice.toLocaleString('he-IL') + ' ₪']);
  if (filters.minRooms != null) filterDescriptions.push(['חדרים מינימום', String(filters.minRooms)]);
  if (filters.maxRooms != null) filterDescriptions.push(['חדרים מקסימום', String(filters.maxRooms)]);
  if (filters.fromDate) filterDescriptions.push(['מתאריך', filters.fromDate]);
  if (filters.toDate) filterDescriptions.push(['עד תאריך', filters.toDate]);

  if (filterDescriptions.length === 0) {
    filterDescriptions.push(['סינון', 'לא הופעל סינון']);
  }

  const data: (string | Date)[][] = [
    ['דוח ניתוח שוק נדל"ן', ''],
    ['', ''],
    ['נוצר על ידי', generatedBy],
    ['תאריך יצירה', generatedAt.toLocaleString('he-IL')],
    ['', ''],
    ['סינונים שהופעלו', ''],
    ...filterDescriptions,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [{ wch: 22 }, { wch: 28 }];
  sheet['!views'] = [{ RTL: true }];

  return sheet;
}

/**
 * Trigger browser download of the workbook.
 * Client-side only (uses Blob + anchor).
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const wbArray = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Clean up in next tick
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Build a meaningful filename: analytics-tel-aviv-2026-04-19.xlsx
 */
export function buildExportFilename(filters: AnalyticsFilters, generatedAt: Date): string {
  const parts = ['analytics'];

  if (filters.city) {
    // Transliterate common Hebrew city names (or just use timestamp if complex)
    parts.push(filters.city.replace(/\s+/g, '-'));
  }

  const date = generatedAt.toISOString().slice(0, 10);
  parts.push(date);

  return parts.join('-') + '.xlsx';
}
