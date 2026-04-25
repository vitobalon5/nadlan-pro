'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProjectTabs } from '@/components/projects/project-tabs';
import { MediaUploader } from '@/components/projects/media-uploader';
import { MediaGallery } from '@/components/projects/media-gallery';
import { SalesStatusCard } from '@/components/projects/sales-status-card';
import { UnitsManager } from '@/components/projects/units-manager';
import { NeighborhoodInsights } from '@/components/neighborhood/neighborhood-insights';
import { CompetitorsComparisonTable } from '@/components/competitors/comparison-table';
import { AiReportPanel } from '@/components/ai-report/report-panel';
import { ExportButtons } from '@/components/export/export-buttons';
import { formatILS } from '@/lib/utils';

interface Props {
  projectId: string;
  media: any[];
  units: Array<{
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
  }>;
  unitsByStatus: {
    sold: number;
    reserved: number;
    available: number;
    unavailable: number;
  };
  unitsByRooms: Record<string, { count: number; avgPrice: number | null }>;
  totalUnits: number;
  city: string;
  neighborhood: string | null;
  projectSlug: string;
  projectName: string;
  userName: string;
}

export function ProjectDetailClient({
  projectId,
  media,
  units,
  unitsByStatus,
  unitsByRooms,
  totalUnits,
  city,
  neighborhood,
  projectSlug,
  projectName,
  userName,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('overview');

  const tabs = [
    { id: 'overview', label: 'סקירה' },
    { id: 'units', label: 'יחידות דיור', count: totalUnits },
    { id: 'media', label: 'מדיה', count: media.length },
    { id: 'neighborhood', label: 'ניתוח סביבתי' },
    { id: 'market', label: 'השוואת שוק' },
    { id: 'ai-report', label: 'דוח AI', icon: 'sparkles' as const },
    { id: 'export', label: 'ייצוא' },
    { id: 'documents', label: 'מסמכים' },
  ];

  const handleUploadComplete = () => {
    router.refresh();
  };

  const roomEntries = Object.entries(unitsByRooms).sort(([a], [b]) =>
    a === 'other' ? 1 : b === 'other' ? -1 : parseFloat(a) - parseFloat(b)
  );

  return (
    <>
      <ProjectTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            {/* Media preview card */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[hsl(var(--primary-50))] to-[hsl(var(--info-bg))] flex items-center justify-center">
                {media[0]?.public_url ? (
                  <img
                    src={media[0].public_url}
                    alt={media[0].file_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">אין עדיין תמונות</p>
                )}
              </div>
              {media.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto scrollbar-thin">
                  {media.slice(0, 6).map((m, i) => (
                    <div
                      key={m.id}
                      className={`w-16 h-11 rounded-md shrink-0 bg-muted overflow-hidden ${
                        i === 0 ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      {m.public_url && (
                        <img src={m.public_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                  {media.length > 6 && (
                    <div className="w-16 h-11 rounded-md shrink-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      +{media.length - 6}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <SalesStatusCard total={totalUnits} {...unitsByStatus} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>העלאת מדיה חדשה</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploader projectId={projectId} onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>

          {roomEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>יחידות דיור</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {roomEntries.map(([rooms, data]) => (
                    <div key={rooms} className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        {rooms === 'other' ? 'אחר' : `${rooms} חדרים`}
                      </p>
                      <p className="text-base font-medium">{data.count} יחידות</p>
                      {data.avgPrice && (
                        <p className="text-xs text-[hsl(var(--success))] mt-1">
                          {formatILS(data.avgPrice)} ממוצע
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>העלאת קבצים</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploader projectId={projectId} onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium mb-3">קבצים שהועלו ({media.length})</h3>
            <MediaGallery
              projectId={projectId}
              initialMedia={media}
              onDelete={handleUploadComplete}
            />
          </div>
        </div>
      )}

      {activeTab === 'units' && <UnitsManager projectId={projectId} initialUnits={units} />}

      {activeTab === 'neighborhood' && (
        <NeighborhoodInsights city={city} neighborhood={neighborhood} />
      )}

      {activeTab === 'market' && <CompetitorsComparisonTable projectSlug={projectSlug} />}

      {activeTab === 'ai-report' && (
        <AiReportPanel projectSlug={projectSlug} projectId={projectId} />
      )}

      {activeTab === 'export' && (
        <ExportButtons
          projectSlug={projectSlug}
          projectName={projectName}
          userName={userName}
        />
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            מסמכים — בקרוב
          </CardContent>
        </Card>
      )}
    </>
  );
}
