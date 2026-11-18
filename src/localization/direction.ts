import type { CSSProperties } from 'react';
import type { Direction } from './config';

export const pickDirectionalValue = <T,>(direction: Direction, ltrValue: T, rtlValue: T): T => {
  return direction === 'rtl' ? rtlValue : ltrValue;
};

export const bidiIsolateClassName = 'bidi-isolate';
export const ltrValueClassName = 'ltr-value bidi-isolate';

export const ltrValueProps: { dir: 'ltr'; style: CSSProperties } = {
  dir: 'ltr',
  style: {
    unicodeBidi: 'isolate',
  },
};
