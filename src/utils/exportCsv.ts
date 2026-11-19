export function exportCsv(filename: string, rows: (string | number | null)[][]) {
  const content = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          // Prevent spreadsheet formula execution in exported user-controlled values.
          return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(
    new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
