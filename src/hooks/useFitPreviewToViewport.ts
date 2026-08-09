import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

// Shrinks a fixed-size "printable sheet simulation" node (the Invoice/Quotation preview boxes in
// CustomerDetails/MyBills) to fit entirely within its viewport — both width AND height — so a
// phone's fullscreen preview dialog shows the WHOLE bill by default instead of needing a scroll
// to see it all. Native pinch-zoom (still active on iOS even with this app's `user-scalable=no`
// viewport meta, since iOS enforces zoom for accessibility regardless) is what a user then uses
// to inspect any one part closely — this hook only handles "fit everything on screen first", not
// zooming itself.
//
// Three nested nodes, on purpose:
//   viewportRef (stable — sized by CSS/flex layout, never touched here) — the space available
//   sizerRef    (JS-set height only) — collapses to the content's scaled-down visual size, so the
//               viewport doesn't reserve the content's full, unscaled height below it
//   contentRef  (JS-set transform only) — the actual sheet; a `transform: scale()` is purely
//               visual and never affects layout, so offsetWidth/offsetHeight here always read the
//               sheet's real, natural size regardless of its own current scale
// Measuring from viewportRef (not sizerRef, which we resize ourselves) avoids a feedback loop.
//
// html2canvas-based PDF/WhatsApp export (see utils/billPdf.ts) strips this transform before
// capturing, so exports are always full quality — never the shrunk-for-display version.
export function useFitPreviewToViewport(
  viewportRef: RefObject<HTMLElement | null>,
  sizerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const sizer = sizerRef.current;
    const content = contentRef.current;
    if (!enabled) {
      if (content) content.style.transform = '';
      if (sizer) sizer.style.height = '';
      return;
    }
    if (!viewport || !sizer || !content) return;

    const fit = () => {
      const availW = viewport.clientWidth;
      const availH = viewport.clientHeight;
      const naturalW = content.offsetWidth;
      const naturalH = content.offsetHeight;
      if (!availW || !availH || !naturalW || !naturalH) return;
      const scale = Math.min(1, availW / naturalW, availH / naturalH);
      content.style.transform = `scale(${scale})`;
      content.style.transformOrigin = 'top center';
      sizer.style.height = `${naturalH * scale}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
