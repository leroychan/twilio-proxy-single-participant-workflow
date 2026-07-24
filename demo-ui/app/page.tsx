'use client';

import { SiteHeader } from '@/components/site-header';
import { LiveFeed } from '@/components/live-feed';
import { ReservedNumbers } from '@/components/reserved-numbers';
import { StagingArea } from '@/components/staging-area';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-surface-primary text-on-primary">
      <SiteHeader />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <LiveFeed />
        <ReservedNumbers />
        <StagingArea />
      </div>
    </main>
  );
}
