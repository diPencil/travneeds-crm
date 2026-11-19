import { catalogueName, type CatalogueEntry } from '../../../shared/catalogue/catalogue.contracts';
import { Select } from '../../components/ui/Select';
import { useQuotationText } from '../quotations/quotation.labels';

export function CataloguePicker({
  id,
  label,
  entries,
  value = '',
  onSelect,
  emptyText,
  disabled = false,
}: {
  id: string;
  label: string;
  entries: CatalogueEntry[];
  value?: string;
  onSelect: (entry: CatalogueEntry | undefined) => void;
  emptyText?: string;
  disabled?: boolean;
}) {
  const { isRTL, text } = useQuotationText();
  return (
    <Select
      id={id}
      label={label}
      value={entries.some((entry) => entry.id === value) ? value : ''}
      disabled={disabled}
      onChange={(event) => onSelect(entries.find((entry) => entry.id === event.target.value))}
    >
      <option value="">{emptyText ?? text('Choose from catalogue', 'اختار من الكتالوج')}</option>
      {entries.map((entry) => (
        <option value={entry.id} key={entry.id}>
          {catalogueName(entry.name, isRTL ? 'ar' : 'en')}
        </option>
      ))}
    </Select>
  );
}
