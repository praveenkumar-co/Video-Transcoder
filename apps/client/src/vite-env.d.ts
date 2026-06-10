/// <reference types="vite/client" />

type DotLottiePlayerAttributes = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
  src?: string;
  background?: string;
  speed?: string;
  loop?: boolean;
  autoplay?: boolean;
}, HTMLElement>;

declare namespace JSX {
  interface IntrinsicElements {
    'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { url?: string }, HTMLElement>;
    'dotlottie-player': DotLottiePlayerAttributes;
  }
}

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-player': DotLottiePlayerAttributes;
    }
  }
}
