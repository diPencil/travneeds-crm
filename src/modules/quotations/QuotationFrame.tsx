import { useState, type Ref } from 'react';
export function QuotationFrame({
  html,
  title,
  printFrame,
}: {
  html: string;
  title: string;
  printFrame?: Ref<HTMLIFrameElement>;
}) {
  const [height, setHeight] = useState(1200);
  return (
    <iframe
      ref={printFrame}
      title={title}
      srcDoc={html}
      sandbox={
        printFrame
          ? 'allow-same-origin allow-popups allow-modals'
          : 'allow-same-origin allow-popups'
      }
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
