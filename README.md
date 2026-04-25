# Nadlan Pro — פלטפורמת ניהול וניתוח נדל"ן

מערכת מודולרית לניהול פרויקטי נדל"ן, איסוף נתוני שוק וניתוח מגמות.

## ✨ מה כבר מוכן

### 🔐 אימות וכניסה
- דף Login מעוצב (split-screen עם פאנל מיתוג)
- middleware שמגן על כל הדפים האוטנטיים
- Session refresh אוטומטי
- RBAC בשלוש רמות: admin / editor / viewer

### 🎯 דף Dashboard (`/dashboard`)
- נגיש רק למחוברים (מוגן ב-middleware + layout)
- ברכה דינמית לפי שעה (בוקר/צהריים/ערב טוב)
- KPIs: סה"כ פרויקטים, פרויקטים פעילים
- רשימת פרויקטים אחרונים עם תאריכים יחסיים
- Warning banner למשתמשי viewer ללא הרשאות יצירה
- Empty state ייעודי כשאין פרויקטים

### 🧙 Wizard ליצירת פרויקט (4 שלבים)
- **שלב 1: פרטי פרויקט** - שם, slug, סוג, סטטוס, יזם, תיאור
- **שלב 2: מיקום** - עיר, שכונה, כתובת, גוש/חלקה, קואורדינטות
- **שלב 3: תמחור ולו"ז** - מחירים, יחידות, תאריכים (עם live summary)
- **שלב 4: מדיה** - drag & drop עם preview וסימון תמונה ראשית
- Stepper לחיץ - מעבר בין שלבים מלאים
- Validation פר-שלב עם Zod (cross-field: price_max >= price_min, תאריכים)
- Auto-slug generation שמכבד עריכה ידנית
- Progress bar של העלאות בזמן אמת
- Success screen עם ניווט אוטומטי

### 📊 דף Analytics
- טבלה עם סינון לפי עיר, שכונה, מקור, סוג, מחירים, חדרים, תאריכים
- Date presets (שבוע/חודש/3 חודשים/שנה/מתחילת שנה)
- Sorting על כל עמודה, pagination ברמת DB
- KPI cards (ממוצע/חציון מחירים, ממוצע למ"ר)
- ייצוא לאקסל עם 3 גיליונות (נתונים/סיכום/סינון שהופעל)
- Race-condition-safe fetching

### 🛡️ Security Hardening (3 שכבות הגנה)

**שכבה 1 - Middleware:** בדיקת auth + is_active בכל בקשה. משתמש שהושבת נחסם מיד.

**שכבה 2 - Server Actions:** כל כתיבה ל-DB (יצירת פרויקט, העלאת מדיה, מחיקה) עוברת דרך Server Actions עם בדיקת role. Client-side ב-UI לא מבצע insert/update ישיר.

**שכבה 3 - Database:**
- **RLS Policies** ב-Postgres לכל טבלה
- **BEFORE UPDATE trigger** שחוסם שינוי role/is_active לכל מי שאינו admin (גם אם RLS ייעקף)
- **CHECK constraints**: `price_min <= price_max`, `start_date <= completion_date`, `area > 0`, `rooms <= 30`
- **UNIQUE index** שמבטיח רק תמונה ראשית אחת לפרויקט


- רשימת פרויקטים עם חיפוש, סינון סטטוס, ו-debounced search
- יצירת פרויקט חדש בדיאלוג מעוצב עם validation (Zod + react-hook-form)
- auto-slug generation משם הפרויקט
- דף פרויקט עם tabs: סקירה, יחידות, מדיה, שוק, מסמכים
- Breadcrumbs, badges סטטוס, progress bars למכירות

### 📤 Drag & Drop מדיה
- העלאה מקבילה של מספר קבצים
- preview לתמונות לפני העלאה
- סיווג אוטומטי של סוג מדיה (image/rendering/floor_plan) לפי שם קובץ
- progress bar לכל קובץ בנפרד
- gallery עם hover-to-delete
- העלאה ל-Supabase Storage + רשומה ב-`project_media`

### 🎨 Design System
- פלטה סגולה-כחולה (modern tech)
- Light / Dark / System mode עם זיכרון ב-localStorage
- תמיכה מלאה ב-RTL עברית
- כל הקומפוננטות עם focus rings, disabled states, ו-keyboard navigation
- Smooth transitions ו-animations

### 🗄️ Database
- 6 טבלאות: profiles, projects, project_media, project_units, market_listings, scraping_jobs
- RLS Policies מלאים ל-RBAC
- Storage bucket עם מדיניות גישה
- 4 analytical views למודל ניתוח שוק
- Auto-profile creation trigger, updated_at triggers

### 🕷️ Scraping infrastructure
- Base scraper class עם retry logic ו-rate limiting
- Scraper מוכן לרשות המיסים (nadlan.gov.il) — המקור הנקי ביותר
- Registry pattern - קל להוסיף scrapers חדשים (Madlan via Apify, יד2)

---

## 🚀 התקנה והרצה

### דרישות מקדימות
- Node.js 18.17+
- חשבון Supabase ([supabase.com](https://supabase.com))
- npm או pnpm

### 1. התקנת dependencies

```bash
npm install
```

### 2. הגדרת Supabase

```bash
# התקנת CLI (אם אין)
npm install -g supabase

# יצירת פרויקט ב-Supabase Dashboard, ואז:
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# הרצת המיגרציות
supabase db push
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

מלא את הערכים הבאים מ-Supabase Dashboard → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. יצירת משתמש ראשון (admin)

Supabase Auth לא מאפשר הרשמה ציבורית בפלטפורמה הזו (by design — רק עובדים).
צור משתמש דרך Dashboard → Authentication → Users → Add user.

אחרי יצירת המשתמש, שדרג אותו ל-admin ב-SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```

### 5. הרצה

```bash
npm run dev
```

פתח `http://localhost:3000` → תופנה ל-`/login`.

---

## 📁 מבנה הפרויקט

```
src/
├── app/
│   ├── (auth)/login/          # דף כניסה
│   ├── (dashboard)/
│   │   ├── layout.tsx          # סיידבר + בדיקת אימות
│   │   ├── projects/
│   │   │   ├── page.tsx        # רשימת פרויקטים
│   │   │   └── [slug]/         # פרויקט ספציפי
│   │   ├── market-analysis/    # (טרם נבנה)
│   │   └── scraping/           # (טרם נבנה)
│   ├── api/                    # API routes ל-scraping
│   ├── layout.tsx              # root layout + theme
│   └── globals.css             # design tokens
├── components/
│   ├── ui/                     # Button, Input, Card, Dialog, Select...
│   ├── projects/               # ProjectRow, MediaUploader, etc.
│   ├── sidebar.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── supabase/               # client.ts, server.ts
│   ├── scrapers/               # base + implementations
│   └── utils/
├── types/
│   ├── domain.ts               # Zod schemas
│   └── database.types.ts       # stub - regenerate with CLI
└── middleware.ts

supabase/migrations/
├── 20250101000000_initial_schema.sql
├── 20250101000001_rls_policies.sql
└── 20250101000002_analytics_views.sql
```

---

## 🔄 פקודות שימושיות

```bash
npm run dev            # הרצה בפיתוח
npm run build          # build ל-production
npm run db:types       # יצירת types מ-Supabase
npm run db:push        # העלאת מיגרציות
npm run lint           # בדיקת lint
```

---

## 🧪 בדיקה מקצה לקצה (smoke test)

1. הרץ `npm run dev`
2. עבור ל-`http://localhost:3000` → תועבר ל-login
3. היכנס עם המשתמש שיצרת
4. תגיע ל-`/projects` — רשימה ריקה + Empty state
5. לחץ "פרויקט ראשון" → מלא טופס → יווצר פרויקט
6. תועבר אוטומטית לדף הפרויקט
7. גרור תמונה לאזור ההעלאה → תראה progress → תופיע ב-gallery
8. החלף theme (כפתור העליון בסיידבר) → הצבעים מתחלפים חלק

---

## 🚧 מה לבנות הבא (לפי סדר עדיפות)

1. **ניהול יחידות דיור** — טבלה עם עריכה inline, סטטוס מכירה
2. **Madlan integration via Apify** — adapter חדש בתיקיית scrapers
3. **Market Analysis Dashboard** — recharts על ה-views שכבר קיימים
4. **Excel Export** — עם ExcelJS שכבר בתלויות
5. **ניהול משתמשים** — למשתמשי admin בלבד
6. **Notifications / Toast** — Radix Toast כבר מותקן

---

## 📝 הערות חשובות

**על Apify ל-Madlan:** יש Actor מוכן ([apify.com/swerve/madlan-scraper](https://apify.com/swerve/madlan-scraper)) שמטפל ב-anti-bot ו-proxies. כשמוסיפים, שמור את ה-API token ב-env var.

**על טיפוסי DB:** הקובץ `database.types.ts` הוא stub ראשוני. אחרי `supabase db push` ראשון, תמיד הרץ:
```bash
npx supabase gen types typescript --project-id YOUR_ID > src/types/database.types.ts
```

**על יד2:** יש להם anti-bot אגרסיבי. Apify יש להם Actor גם ליד2 - אותה גישה כמו מדלן.

**על אבטחה:** ה-RLS מגן ברמת ה-DB. גם אם מישהו יעקוף את ה-API, Postgres לא יחזיר לו נתונים שאין לו הרשאה אליהם. זו השכבה הכי חשובה.
