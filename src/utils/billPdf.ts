import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// The printable sheet is laid out at a fixed 194mm physical width (see the "Printable Sheet
// Simulation" containers in CustomerDetails/MyBills) so it always looks like a real A4 page —
// but a phone's actual browser viewport is far narrower, and html2canvas by default re-renders
// content inside a simulated window sized to that real (narrow) viewport. That reflows/squishes
// the 194mm box down to fit, which is what produced the cropped, landscape-looking shares
// reported on some mobile devices. Forcing `windowWidth`/`windowHeight` here makes every device
// capture from the same simulated "desktop-width" layout regardless of its actual screen size,
// so the output is always a correctly-proportioned, strict-portrait A4 sheet — never cropped.
const CAPTURE_WINDOW_WIDTH_PX = 733; // ~194mm at the standard 96 CSS px/inch
const CAPTURE_WINDOW_HEIGHT_PX = 1600; // generous floor so nothing depends on the real viewport height

// One PDF page's height (297mm/A4), expressed in the same CSS-px space as
// CAPTURE_WINDOW_WIDTH_PX — the captured image is later stretched to fill a 210mm-wide PDF page
// (see imgHeight below), so this many px of captured content maps to exactly one page.
const PAGE_HEIGHT_PX = CAPTURE_WINDOW_WIDTH_PX * (297 / 210);

// Elements marked `data-keep-together` (the bank-details/signature block, mainly — see
// CustomerDetails/MyBills) must never have a PDF page boundary land inside them. Since the naive
// "slice a tall image every N mm" pagination below has no idea where element boundaries are,
// this inserts a temporary spacer before any such block that would otherwise straddle a page
// break, pushing the whole thing onto the next page instead. Must run with the node already at
// its final capture width (see the caller) so measurements match what html2canvas will render.
function avoidSplittingKeepTogetherBlocks(node: HTMLElement): HTMLElement[] {
  const inserted: HTMLElement[] = [];
  const nodeTop = node.getBoundingClientRect().top;
  const blocks = Array.from(node.querySelectorAll<HTMLElement>('[data-keep-together]'));
  for (const el of blocks) {
    const rect = el.getBoundingClientRect(); // re-measured fresh each pass — reflects any earlier spacer already inserted above it
    const top = rect.top - nodeTop;
    const height = rect.height;
    if (height >= PAGE_HEIGHT_PX) continue; // too tall to ever fit on one page — nothing to do
    const posInPage = ((top % PAGE_HEIGHT_PX) + PAGE_HEIGHT_PX) % PAGE_HEIGHT_PX;
    if (posInPage + height > PAGE_HEIGHT_PX) {
      const spacer = document.createElement('div');
      spacer.style.height = `${PAGE_HEIGHT_PX - posInPage}px`;
      el.parentElement?.insertBefore(spacer, el);
      inserted.push(spacer);
    }
  }
  return inserted;
}

// Rasterizes a bill/quotation preview node and lays it into a strict A4-portrait PDF, paginating
// (never cropping) if the content is taller than one page. Shared by every "download/share as
// PDF" action across the app so they all get the same device-independent, correctly-proportioned
// output.
export async function renderBillNodeToA4Pdf(node: HTMLElement): Promise<Blob> {
  // The on-screen preview may be visually shrunk to fit a phone's screen (see
  // useFitPreviewToViewport) via a CSS transform, and/or narrower than the capture width on a
  // small screen — both purely display concerns. The export must always be captured at full,
  // untransformed, fixed-width size, so both are overridden for the duration of the capture and
  // restored immediately after.
  const previousTransform = node.style.transform;
  const previousWidth = node.style.width;
  node.style.transform = 'none';
  node.style.width = `${CAPTURE_WINDOW_WIDTH_PX}px`;

  let canvas;
  let spacers: HTMLElement[] = [];
  try {
    spacers = avoidSplittingKeepTogetherBlocks(node);
    canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: CAPTURE_WINDOW_WIDTH_PX,
      windowHeight: Math.max(window.innerHeight, CAPTURE_WINDOW_HEIGHT_PX),
    });
  } finally {
    spacers.forEach((spacer) => spacer.remove());
    node.style.transform = previousTransform;
    node.style.width = previousWidth;
  }
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  return pdf.output('blob');
}
