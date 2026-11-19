-- Itemized invoice payment instructions may exceed the legacy summary field.
ALTER TABLE finance_invoices MODIFY payment_terms VARCHAR(2000) NULL;
