import { useState } from 'react';
export function QuotationFrame({ html, title }: { html: string; title: string }) {
  const [height, setHeight] = useState(1200);
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-same-origin allow-popups"
      referrerPolicy="no-referrer"
      className="w-full rounded-2xl border-0 bg-white"
      style={{ height }}
      onLoad={(event) => {
        const body = event.currentTarget.contentDocument?.body;
        if (body) setHeight(Math.max(800, body.scrollHeight + 24));
      }}
    />
  );
}
