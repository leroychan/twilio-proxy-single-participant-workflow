'use client';

import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export type Mapping = { code: string; parties: string[] };

export function MappingsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Mapping[];
  onEdit: (m: Mapping) => void;
  onDelete: (code: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mappings.code')}</TableHead>
          <TableHead>{t('mappings.partyA')}</TableHead>
          <TableHead>{t('mappings.partyB')}</TableHead>
          <TableHead>{t('mappings.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((m) => (
          <TableRow key={m.code}>
            <TableCell className="font-mono">{m.code}</TableCell>
            <TableCell className="font-mono">{m.parties[0] ?? '—'}</TableCell>
            <TableCell className="font-mono">{m.parties[1] ?? '—'}</TableCell>
            <TableCell className="space-x-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(m)}>
                {t('mappings.edit')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(m.code)}
              >
                {t('mappings.delete')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
