'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { Mapping } from './mappings-table';

export function MappingDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (m: Mapping) => void;
  initial?: Mapping;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  useEffect(() => {
    setCode(initial?.code ?? '');
    setA(initial?.parties[0] ?? '');
    setB(initial?.parties[1] ?? '');
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t('mappings.edit') : t('mappings.add')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('mappings.code')}</Label>
            <Input value={code} disabled={!!initial} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>{t('mappings.partyA')}</Label>
            <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="+15551112222" />
          </div>
          <div>
            <Label>{t('mappings.partyB')}</Label>
            <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="+15551230000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('mappings.cancel')}
          </Button>
          <Button
            disabled={!code || !a || !b}
            onClick={() => onSubmit({ code, parties: [a, b] })}
          >
            {t('mappings.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
