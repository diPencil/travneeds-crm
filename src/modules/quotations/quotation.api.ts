import { ApiError } from '../../lib/http/api';

export async function downloadQuotationPdf(path: string, filename: string, token?: string) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: token ? { 'X-Quotation-Token': token } : {},
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
    const value = await response.json().catch(() => null);
    throw new ApiError(value?.error?.code ?? 'PDF_DOWNLOAD_FAILED', response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function publicQuotationRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/public/quotations${path}`, {
    method,
    credentials: 'omit',
    headers: {
      'X-Quotation-Token': token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => null);
    throw new ApiError(value?.error?.code ?? 'SERVER_ERROR', response.status);
  }
  return response.json() as Promise<T>;
}
