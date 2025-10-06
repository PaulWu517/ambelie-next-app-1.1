// Augment React's JSX so TypeScript recognizes <model-viewer> and its attributes
import type React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        ar?: boolean;
        'ar-modes'?: string;
        'touch-action'?: string;
        'camera-controls'?: boolean;
        style?: React.CSSProperties;
      };
    }
  }
}

export {};