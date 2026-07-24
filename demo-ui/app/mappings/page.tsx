'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteHeader } from '@/components/site-header';
import { MappingsTable, type Mapping } from '@/components/mappings-table';
import { MappingDialog } from '@/components/mapping-dialog';
import { Button } from '@/components/ui/button';

export default function MappingsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Mapping[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Mapping | undefined>();

  const load = useCallback(async () => {
    const res = await fetch('/api/mappings');
    const body = await res.json();
    setItems(body.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (m: Mapping) => {
    if (editing) {
      await fetch(`/api/mappings/${m.code}`, {
        method: 'PUT',
        body: JSON.stringify({ parties: m.parties }),
      });
    } else {
      await fetch('/api/mappings', { method: 'POST', body: JSON.stringify(m) });
    }
    setDialogOpen(false);
    setEditing(undefined);
    await load();
  };

  const remove = async (code: string) => {
    if (!confirm(t('mappings.confirmDelete', { code }))) return;
    await fetch(`/api/mappings/${code}`, { method: 'DELETE' });
    await load();
  };

  return (
    <main className="min-h-screen bg-surface-primary text-on-primary">
      <SiteHeader />
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('mappings.title')}</h1>
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            {t('mappings.add')}
          </Button>
        </div>
        <MappingsTable
          items={items}
          onEdit={(m) => { setEditing(m); setDialogOpen(true); }}
          onDelete={remove}
        />
        <MappingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={submit}
          initial={editing}
        />
      </div>
    </main>
  );
}
