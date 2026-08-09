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

// Rasterizes a bill/quotation preview node and lays it into a strict A4-portrait PDF, paginating
// (never cropping) if the content is taller than one page. Shared by every "download/share as
// PDF" action across the app so they all get the same device-independent, correctly-proportioned
// output.
export async function renderBillNodeToA4Pdf(node: HTMLElement): Promise<Blob> {
  // The on-screen preview may be visually shrunk to fit a phone's screen (see
  // useFitPreviewToViewport) via a CSS transform — purely a display concern. The export must
  // always be captured at full, untransformed size, so any inline transform is removed for the
  // duration of the capture and restored immediately after.
  const previousTransform = node.style.transform;
  node.style.transform = 'none';
  let canvas;
  try {
    canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: CAPTURE_WINDOW_WIDTH_PX,
      windowHeight: Math.max(window.innerHeight, CAPTURE_WINDOW_HEIGHT_PX),
    });
  } finally {
    node.style.transform = previousTransform;
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
