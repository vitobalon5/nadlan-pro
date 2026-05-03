import * as XLSX from 'xlsx';

/**
 * Full project export — a multi-tab Excel workbook containing EVERYTHING
 * we know about a project:
 *   1. פרויקט  - Project info (basics, pricing, developer)
 *   2. יחידות  - Units breakdown (if available)
 *   3. מתחרים  - Competitor comparison table
 *   4. דמוגרפיה - Neighborhood demographics (socioeconomic, age, schools)
 *   5. עסקאות  - Recent transactions from tax authority
 *   6. סיכום   - AI-generated summary (plain text, if available)
 *
 * Each tab is independent — if data is missing for a section, we skip it
 * rather than creating an empty sheet.
 */

export interface FullExportData {
  project: {
    name: string;
    slug: string;
    description: string | null;
    city: string;
    neighborhood: string | null;
    address: string | null;
    developer_name: string | null;
    project_type: string | null;
    status: string | null;
    price_min: number | null;
    price_max: number | null;
    price_per_sqm_avg: number | null;
    total_units: number | null;
    available_units: number | null;
    floors: number | null;
    construction_start_date: string | null;
    expected_completion_date: string | null;
  };
  units: Array<{
    unit_number: string;
    floor: number | null;
    rooms: number | null;
    area_sqm: number | null;
    price: number | null;
    price_per_sqm: number | null;
    status: string;
  }>;
  competitors: Array<{
    name: string;
    marketer: string | null;
    rooms: number | null;
    areaSqm: number | null;
    startingPrice: number | null;
    pricePerSqm: number | null;
    deltaPct: number | null;
    source: string;
    url: string | null;
  }>;
  demographics: {
    socioeconomicCluster: number | null;
    socioeconomicPercentile: number | null;
    avgSchoolRating: number | null;
    totalPopulation: number | null;
    ageDistribution: {
      youth: number;
      youngAdults: number;
      middleAged: number;
      seniors: number;
      elderly: number;
    } | null;
    schools: Array<{
      name: string;
      level: string;
      ratingOutOf10: number;
      studentCount: number | null;
    }>;
  } | null;
  transactions: Array<{
    city: string;
    neighborhood: string | null;
    street: string | null;
    rooms: number | null;
    areaSqm: number | null;
    price: number | null;
    pricePerSqm: number | null;
    transactionDate: string | null;
  }>;
  aiReportText: string | null;
  generatedAt: Date;
  generatedBy: string;
}

export function buildFullProjectWorkbook(data: FullExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Set workbook to RTL
  wb.Workbook = wb.Workbook ?? {};
  wb.Workbook.Views = [{ RTL: true }];
  wb.Props = {
    Title: `דוח שוק — ${data.project.name}`,
    Author: data.generatedBy,
    CreatedDate: data.generatedAt,
  };

  // Tab 1: Project
  XLSX.utils.book_append_sheet(wb, buildProjectSheet(data), 'פרויקט');

  // Tab 2: Units (only if we have any)
  if (data.units.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildUnitsSheet(data.units), 'יחידות');
  }

  // Tab 3: Competitors
  if (data.competitors.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildCompetitorsSheet(data), 'מתחרים');
  }

  // Tab 4: Demographics
  if (data.demographics) {
    XLSX.utils.book_append_sheet(wb, buildDemographicsSheet(data.demographics), 'דמוגרפיה');
  }

  // Tab 5: Transactions
  if (data.transactions.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildTransactionsSheet(data.transactions), 'עסקאות');
  }

  // Tab 6: AI summary (last, since it's often the longest)
  if (data.aiReportText) {
    XLSX.utils.book_append_sheet(wb, buildAiSummarySheet(data.aiReportText), 'סיכום AI');
  }

  return wb;
}

// ---------------------------------------------------------------------------
// TAB BUILDERS
// ---------------------------------------------------------------------------

function buildProjectSheet(data: FullExportData): XLSX.WorkSheet {
  const p = data.project;
  const rows: (string | number | Date | null)[][] = [
    ['דוח שוק מקיף', ''],
    ['', ''],
    ['שם הפרויקט', p.name],
    ['מזהה', p.slug],
    ['תיאור', p.description ?? '—'],
    ['', ''],
    ['סיווג', ''],
    ['סוג', p.project_type ?? '—'],
    ['סטטוס', p.status ?? '—'],
    ['', ''],
    ['מיקום', ''],
    ['עיר', p.city],
    ['שכונה', p.neighborhood ?? '—'],
    ['כתובת', p.address ?? '—'],
    ['', ''],
    ['יזם', ''],
    ['שם', p.developer_name ?? '—'],
    ['', ''],
    ['תמחור', ''],
    ['מחיר מינימום', p.price_min],
    ['מחיר מקסימום', p.price_max],
    ['מחיר למ"ר ממוצע', p.price_per_sqm_avg],
    ['', ''],
    ['היקף', ''],
    ['סה"כ יחידות', p.total_units],
    ['יחידות זמינות', p.available_units],
    ['קומות', p.floors],
    ['', ''],
    ['לוחות זמנים', ''],
    ['תחילת בנייה', p.construction_start_date ? new Date(p.construction_start_date) : '—'],
    ['סיום צפוי', p.expected_completion_date ? new Date(p.expected_completion_date) : '—'],
    ['', ''],
    ['מטא', ''],
    ['נוצר על ידי', data.generatedBy],
    ['תאריך יצירה', data.generatedAt],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  sheet['!cols'] = [{ wch: 22 }, { wch: 40 }];
  sheet['!views'] = [{ RTL: true }];

  // Format currency cells (price rows: indices 19, 20, 21)
  for (const rowIdx of [19, 20, 21]) {
    const cell = sheet[XLSX.utils.encode_cell({ r: rowIdx, c: 1 })];
    if (cell && typeof cell.v === 'number') cell.z = '#,##0" ₪"';
  }

  return sheet;
}

function buildUnitsSheet(units: FullExportData['units']): XLSX.WorkSheet {
  const STATUS_LABELS: Record<string, string> = {
    available: 'זמין',
    reserved: 'באופציה',
    sold: 'נמכר',
    unavailable: 'לא זמין',
  };

  const rows: (string | number | null)[][] = [
    ['מספר יחידה', 'קומה', 'חדרים', 'שטח (מ"ר)', 'מחיר (₪)', 'מחיר למ"ר (₪)', 'סטטוס'],
    ...units.map((u) => [
      u.unit_number,
      u.floor,
      u.rooms,
      u.area_sqm,
      u.price,
      u.price_per_sqm,
      STATUS_LABELS[u.status] ?? u.status,
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  sheet['!views'] = [{ RTL: true, state: 'frozen', ySplit: 1 }];

  // Format price columns (E=4, F=5)
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  for (let r = 1; r <= range.e.r; r++) {
    for (const c of [4, 5]) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0" ₪"';
    }
  }

  return sheet;
}

function buildCompetitorsSheet(data: FullExportData): XLSX.WorkSheet {
  const SOURCE_LABELS: Record<string, string> = {
    yad2: 'יד2',
    madlan: 'מדלן',
    onmap: 'Onmap',
    homeless: 'Homeless',
    self: 'הפרויקט שלנו',
    other: 'אחר',
  };

  const selfPrice = data.project.price_per_sqm_avg;

  const rows: (string | number | null)[][] = [
    ['הסבר', ''],
    [
      'פער מחיר חיובי (+) = המתחרה יקר יותר, יתרון לפרויקט שלנו',
      '',
    ],
    ['פער מחיר שלילי (-) = המתחרה זול יותר, חיסרון תחרותי', ''],
    ['', ''],
    [
      'שם',
      'משווק',
      'חדרים',
      'שטח (מ"ר)',
      'החל מ- (₪)',
      'מחיר למ"ר (₪)',
      'פער %',
      'מקור',
      'קישור',
    ],
  ];

  // Add self row first
  if (selfPrice != null) {
    rows.push([
      `${data.project.name} (הפרויקט שלנו)`,
      data.project.developer_name ?? '—',
      null,
      null,
      data.project.price_min,
      selfPrice,
      null,
      'הפרויקט שלנו',
      null,
    ]);
  }

  for (const c of data.competitors) {
    rows.push([
      c.name,
      c.marketer ?? '—',
      c.rooms,
      c.areaSqm,
      c.startingPrice,
      c.pricePerSqm,
      c.deltaPct,
      SOURCE_LABELS[c.source] ?? c.source,
      c.url,
    ]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 40 },
  ];
  sheet['!views'] = [{ RTL: true, state: 'frozen', ySplit: 5 }];

  // Format columns
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  for (let r = 5; r <= range.e.r; r++) {
    // Price columns E=4, F=5
    for (const c of [4, 5]) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0" ₪"';
    }
    // Delta column G=6 - percentage format
    const deltaCell = sheet[XLSX.utils.encode_cell({ r, c: 6 })];
    if (deltaCell && typeof deltaCell.v === 'number') deltaCell.z = '+0.0"%";-0.0"%"';
  }

  return sheet;
}

function buildDemographicsSheet(d: NonNullable<FullExportData['demographics']>): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['ניתוח סביבתי', ''],
    ['מקורות: הלמ"ס, משרד החינוך', ''],
    ['', ''],
    ['מדד חברתי-כלכלי', ''],
    ['אשכול (1-10)', d.socioeconomicCluster],
    ['אחוזון ארצי', d.socioeconomicPercentile],
    ['', ''],
    ['חינוך', ''],
    ['דירוג ממוצע בתי ספר', d.avgSchoolRating],
    ['', ''],
  ];

  if (d.schools.length > 0) {
    rows.push(['רשימת בתי ספר', '', '', '']);
    rows.push(['שם', 'שלב', 'דירוג', 'תלמידים']);
    const LEVEL_LABELS: Record<string, string> = {
      elementary: 'יסודי',
      middle: 'חט"ב',
      high: 'תיכון',
      other: 'אחר',
    };
    for (const s of d.schools) {
      rows.push([s.name, LEVEL_LABELS[s.level] ?? s.level, s.ratingOutOf10, s.studentCount]);
    }
    rows.push(['', '']);
  }

  if (d.ageDistribution) {
    rows.push(['התפלגות גילאים', '']);
    rows.push(['סה"כ אוכלוסייה', d.totalPopulation]);
    rows.push(['0-17', d.ageDistribution.youth]);
    rows.push(['18-34', d.ageDistribution.youngAdults]);
    rows.push(['35-54', d.ageDistribution.middleAged]);
    rows.push(['55-74', d.ageDistribution.seniors]);
    rows.push(['75+', d.ageDistribution.elderly]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 12 }];
  sheet['!views'] = [{ RTL: true }];

  return sheet;
}

function buildTransactionsSheet(tx: FullExportData['transactions']): XLSX.WorkSheet {
  const rows: (string | number | Date | null)[][] = [
    ['עסקאות נדל"ן אחרונות', '', '', '', '', '', '', ''],
    ['מקור: רשות המיסים · נאסף אוטומטית', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['עיר', 'שכונה', 'רחוב', 'חדרים', 'שטח (מ"ר)', 'מחיר (₪)', 'מחיר למ"ר (₪)', 'תאריך'],
    ...tx.map((t) => [
      t.city,
      t.neighborhood,
      t.street,
      t.rooms,
      t.areaSqm,
      t.price,
      t.pricePerSqm,
      t.transactionDate ? new Date(t.transactionDate) : null,
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  sheet['!views'] = [{ RTL: true, state: 'frozen', ySplit: 4 }];

  // Format price columns F=5, G=6 and date column H=7
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  for (let r = 4; r <= range.e.r; r++) {
    for (const c of [5, 6]) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0" ₪"';
    }
    const dateCell = sheet[XLSX.utils.encode_cell({ r, c: 7 })];
    if (dateCell && dateCell.v instanceof Date) {
      dateCell.t = 'd';
      dateCell.z = 'yyyy-mm-dd';
    }
  }

  return sheet;
}

function buildAiSummarySheet(htmlText: string): XLSX.WorkSheet {
  // Strip HTML tags for plaintext Excel cell
  const plainText = htmlText
    .replace(/<\/?(h2|h3|p|li|br)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '【$1】')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  const rows: string[][] = [
    ['דוח שוק AI'],
    ['נוצר על ידי Gemini'],
    [''],
    [plainText],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 100 }];
  sheet['!rows'] = [{}, {}, {}, { hpt: 400 }];
  sheet['!views'] = [{ RTL: true }];

  // Wrap text in the content cell
  const contentCell = sheet['A4'];
  if (contentCell) {
    contentCell.s = { alignment: { wrapText: true, vertical: 'top' } };
  }

  return sheet;
}

// ---------------------------------------------------------------------------
// Trigger download
// ---------------------------------------------------------------------------

export function downloadFullProjectWorkbook(wb: XLSX.WorkBook, filename: string): void {
  const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
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

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
