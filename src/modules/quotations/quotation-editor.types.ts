import type { Dispatch, SetStateAction } from 'react';
import type {
  QuotationContent,
  QuotationOptions,
} from '../../../shared/quotations/quotation.contracts';

export interface QuotationTabProps {
  content: QuotationContent;
  setContent: Dispatch<SetStateAction<QuotationContent>>;
  language: 'en' | 'ar';
  options: QuotationOptions;
  disabled: boolean;
  onUploadState: (active: boolean) => void;
}
