'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function ProjectTabs({ tabs, activeTab, onChange }: Props) {
  return (
    <div className="border-b mb-6">
      <div className="flex gap-0 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm border-b-2 transition-colors flex items-center gap-2',
              activeTab === tab.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs text-muted-foreground">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
