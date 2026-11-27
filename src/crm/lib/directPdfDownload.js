import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
};

// Keep configuration parsing in the shared exporter so every PDF entry point
// interprets saved template settings in exactly the same way.
export const pdfLayoutOptionsFromConfig = (config = {}) => {
  const footerGapPercent = clamp(config.pdfFooterGapPercent, 0, 30, 10);
  const pageFillPercent = clamp(config.pdfPageFillPercent, 60, 100 - footerGapPercent, 100 - footerGapPercent);
  return {
    // Millimetre values are deliberately shared by Download, Print, and
    // email attachment generation. This makes the builder ruler a real PDF
    // safe-area control rather than a preview-only decoration.
    margin: clamp(config.pdfSideMarginMm, 0, 20, 0),
    topMargin: clamp(config.pdfTopMarginMm, 0, 20, 2),
    contentScalePercent: clamp(config.pdfContentScalePercent, 75, 100, 100),
    footerGapPercent,
    pageFillPercent,
    keepSectionsTogether: config.pdfKeepSectionsTogether !== false,
    cardPaddingPercent: clamp(config.pdfCardPaddingPercent, 75, 125, 100),
    cardSpacingPercent: clamp(config.pdfCardSpacingPercent, 70, 140, 100),
  };
};

// The upload proxy deliberately accepts only the application's configured S3
// locations.  Do not send public design images (for example Unsplash cover
// photos) through it: the proxy rejects those URLs and html2canvas then renders
// an empty grey area in the downloaded PDF.
const shouldUseUploadProxy = (url) => {
  try {
    return /(^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

const pdfImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    if (new URL(url).origin === window.location.origin) return url;
  } catch { return url; }
  if (!shouldUseUploadProxy(url)) return url;
  const apiBase = '/api';
  return `${apiBase}/uploads/proxy?url=${encodeURIComponent(url)}`;
};

const rewriteBackgroundImages = (root) => {
  root.querySelectorAll('[style*="background-image"]').forEach((node) => {
    const backgroundImage = node.style.backgroundImage;
    if (!backgroundImage) return;
    node.style.backgroundImage = backgroundImage.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, _quote, url) => `url("${pdfImageUrl(url)}")`);
  });
};

// The renderer rasterises the document and then cuts that image into A4
// slices. CSS page-break rules do not apply at that stage, so retain the
// natural document flow and identify the sections that may be moved intact.
const keepTogetherRanges = (source, canvas, pageHeightPx) => {
  const sourceRect = source.getBoundingClientRect();
  if (!sourceRect.width) return [];
  const scale = canvas.width / sourceRect.width;
  const ranges = [];
  const candidates = new Map();
  const addCandidate = (element, priority) => {
    const currentPriority = candidates.get(element);
    if (currentPriority === undefined || priority < currentPriority) candidates.set(element, priority);
  };
  const addRange = (top, bottom, priority = 2) => ranges.push({
    start: Math.round((top - sourceRect.top) * scale),
    end: Math.round((bottom - sourceRect.top) * scale),
    priority,
  });

  // Prefer complete cards to nested image/table/list ranges. A card that
  // starts inside the footer is moved as one unit; a nested image is only a
  // fallback when its parent cannot be moved without a large blank gap.
  // Explicit keep-together blocks (itinerary days, voucher cards, etc.) are
  // never allowed to be sliced. They receive a distinct priority from normal
  // section headings so pagination can protect the card without turning a
  // regular heading into a mostly-empty page.
  source.querySelectorAll('[data-pdf-keep-together="true"]').forEach((element) => {
    // A day is a flowing container: only its individual services are atomic.
    // Protecting a whole long day wastes the remaining space on a PDF page.
    if (element.matches('[data-pdf-itinerary-day]')) return;
    // Some templates mark a visual page/section and the individual cards
    // inside it. Only the innermost marked unit is a real keep-together card;
    // moving its parent would create an unnecessary almost-empty page.
    if (!element.querySelector('[data-pdf-keep-together="true"]')) addCandidate(element, 0);
  });
  source.querySelectorAll('[data-pdf-itinerary-service]').forEach((element) => {
    // When a template has already grouped services into a complete printable
    // card, that outer card is the only valid page boundary. Selecting the
    // inner service would leave the continuation title on the previous page.
    const containingCard = element.parentElement?.closest('[data-pdf-keep-together="true"]');
    // A card taller than one physical page cannot move as a unit. In that
    // exceptional case the service remains the safe fallback boundary.
    if (containingCard && (containingCard.getBoundingClientRect().height * scale) <= pageHeightPx) return;
    addCandidate(element, 0);
  });
  // Keep only atomic voucher items together. In particular, do not add page
  // wrappers, table wrappers, complete sections, or every class containing
  // "-card" here: moving those broad containers was the reason a half-empty
  // A4 page was created before a guest row or a small service table.
  source.querySelectorAll('.itinerary-day, .civ-day-service, .civ-service-terms, .civ-completion-footer, .civ-footer-1, .civ-footer-2, .civ-itinerary-hero, .civ-new-info-row, .civ-hotel-card, .tiv-no-break, .tiv-card, .tiv-row, .tiv-service, .mjv-no-break').forEach((element) => {
    if (!element.querySelector('[data-pdf-keep-together="true"]')) addCandidate(element, 1);
  });
  // A long card can be taller than one page. Its paragraphs, headings and
  // list entries remain safe fallback boundaries, so text is never rasterised
  // halfway through a line when the parent itself cannot be moved as one unit.
  source.querySelectorAll('figure, tr, li, p, h1, h2, h3, h4, h5, h6, blockquote').forEach((element) => addCandidate(element, 2));
  source.querySelectorAll('img').forEach((element) => addCandidate(element, 3));
  source.querySelectorAll('*').forEach((element) => {
    if (element.querySelector('[data-pdf-keep-together="true"]')) return;
    const style = window.getComputedStyle(element);
    if (style.breakInside !== 'avoid' && style.pageBreakInside !== 'avoid') return;

    // Some existing screens put `break-inside: avoid` on a whole visual page
    // or section. Respect the rule for a leaf card, but let a container with
    // table rows or individual service cards flow naturally. Those child
    // rows/cards are already safe boundaries above.
    const hasAtomicChild = element.querySelector('table, tr, .itinerary-day, .civ-day-service, .civ-hotel-card, .tiv-no-break, .tiv-card, .tiv-row, .tiv-service, .mjv-no-break');
    if (!hasAtomicChild) addCandidate(element, 1);
  });

  candidates.forEach((priority, element) => {
    const rect = element.getBoundingClientRect();
    const height = rect.height * scale;
    // A range taller than one page cannot be moved intact. Let it flow instead
    // of manufacturing a nearly empty page before it.
    if (height > 0 && height <= pageHeightPx) addRange(rect.top, rect.bottom, priority);
  });

  // Section headers in the shared templates are paired with their immediate
  // content container. This protects the header and first block without
  // reserving a full authored A4 sheet (which caused the large blank gaps).
  source.querySelectorAll('[data-pdf-section-heading="true"]').forEach((heading) => {
    const headingRect = heading.getBoundingClientRect();
    const next = heading.nextElementSibling;
    const nextRect = next?.getBoundingClientRect();
    const bottom = nextRect && nextRect.height <= pageHeightPx * 0.35 ? nextRect.bottom : headingRect.bottom;
    // A heading is a lower-priority boundary than the card row beneath it.
    // If both overlap a page edge, move the row rather than pushing an entire
    // heading-and-section container to the next page.
    addRange(headingRect.top, bottom, 2);
  });

  // Confirmation vouchers use visual headers rather than the generic PDF
  // heading attribute. Keep each header with its first compact content block
  // so the next page never starts with only a sliced banner or heading.
  source.querySelectorAll('.civ-section-header, .civ-timeline-header-wrap').forEach((heading) => {
    const headingRect = heading.getBoundingClientRect();
    const nextRect = heading.nextElementSibling?.getBoundingClientRect();
    const bottom = nextRect && (nextRect.height + headingRect.height) <= pageHeightPx * 0.38
      ? nextRect.bottom
      : headingRect.bottom;
    addRange(headingRect.top, bottom, 0);
  });

  // A confirmation-itinerary day can contain several detailed services and
  // therefore must be allowed to continue onto a following page. Its opening
  // (day circle, image, title and first service) is nevertheless one visual
  // unit. Keep that opening together so a page never ends with just “Day 3”
  // while the actual service begins on the next page.
  source.querySelectorAll('.civ-timeline-item').forEach((day) => {
    const dayRect = day.getBoundingClientRect();
    const firstService = day.querySelector('.civ-day-service, .civ-day-service-description');
    const firstServiceRect = firstService?.getBoundingClientRect();
    if (!firstServiceRect) return;
    if ((firstServiceRect.bottom - dayRect.top) * scale <= pageHeightPx) {
      addRange(dayRect.top, firstServiceRect.bottom, 0);
    }
  });

  // The standard voucher has a different itinerary renderer: its D1/D2/D3
  // heading is the outer `.itinerary-day`, while each service inside is an
  // explicit keep-together article. Keep the heading and first such article
  // in one range, otherwise a PDF page can end with the day heading and start
  // the next page with the actual service.
  source.querySelectorAll('.itinerary-day').forEach((day) => {
    const dayRect = day.getBoundingClientRect();
    const firstService = day.querySelector('[data-pdf-keep-together="true"]');
    const firstServiceRect = firstService?.getBoundingClientRect();
    if (!firstServiceRect) return;
    if ((firstServiceRect.bottom - dayRect.top) * scale <= pageHeightPx) {
      addRange(dayRect.top, firstServiceRect.bottom, 0);
    }
  });

  // Quotation templates keep the day heading with the first service, while
  // later services may continue naturally onto the next PDF page.
  source.querySelectorAll('[data-pdf-itinerary-day]').forEach((day) => {
    const dayRect = day.getBoundingClientRect();
    const firstServiceRect = day.querySelector('[data-pdf-itinerary-service]')?.getBoundingClientRect();
    if (!firstServiceRect) return;
    if ((firstServiceRect.bottom - dayRect.top) * scale <= pageHeightPx) {
      addRange(dayRect.top, firstServiceRect.bottom, 0);
    }
  });

  return ranges
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.priority - right.priority);
};

const renderPdfPagesFromElement = async (element, prepareSource, options = {}) => {
  const source = element?.cloneNode(true);
  if (!source) throw new Error('Document content is not ready yet.');
  const backgroundColor = options.backgroundColor || '#ffffff';
  const margin = Math.max(0, Number(options.margin || 0));
  const contentScale = clamp(options.contentScalePercent, 75, 100, 100) / 100;
  const cardPaddingScale = clamp(options.cardPaddingPercent, 75, 125, 100) / 100;
  const cardSpacingScale = clamp(options.cardSpacingPercent, 70, 140, 100) / 100;
  // Saved quotation templates are composed on a 595px A4 preview. Preserve
  // that exact rendered width for the clone; expanding it to CSS 210mm can
  // change grid/card heights and make a page that fits in preview overflow.
  const previewWidth = Math.max(1, Math.round(element.getBoundingClientRect().width || element.offsetWidth || 595));
  // A very small top inset prevents content from touching the physical page
  // edge in Chrome while preserving the compact, flowing layout.
  const topMargin = Math.max(0, Number(options.topMargin ?? 2));

  prepareSource?.(source);
  // The original source lives in a screen-reader-hidden, off-screen holder.
  // Remove that state on the print clone as well as its coordinates so every
  // browser has a normal, paintable document tree to paginate.
  source.removeAttribute('aria-hidden');
  Object.assign(source.style, {
    // Do not place the render target tens of thousands of pixels outside the
    // viewport. Chromium sometimes rasterises that region as an empty canvas,
    // which produces a completely blank browser print preview. Keeping it at
    // the viewport origin in a layer behind the application keeps it invisible
    // to the user while guaranteeing that html2canvas can paint it.
    position: 'absolute', left: '0', top: '0', width: `${previewWidth}px`,
    background: backgroundColor, pointerEvents: 'none', zIndex: '-1',
  });
  source.style.setProperty('--voucher-card-padding-scale', String(cardPaddingScale));
  source.style.setProperty('--voucher-card-spacing-scale', String(cardSpacingScale));
  // Keep the visible flow layout but remove authored sheet-height/page-break
  // rules. The canvas slicer maps the same 595px preview proportionally onto
  // physical A4, so the preview and exported page make identical fit choices.
  const exportStyles = document.createElement('style');
  exportStyles.textContent = `
    * { box-sizing: border-box !important; }
    .a4-page { min-height: 0 !important; height: auto !important; margin: 0 !important; overflow: visible !important; page-break-after: auto !important; break-after: auto !important; }
    [data-pdf-keep-together="true"], [data-pdf-itinerary-service], [data-pdf-section-heading="true"], .civ-service-terms, .civ-completion-footer, .civ-footer-1, .civ-footer-2 { break-inside: avoid !important; page-break-inside: avoid !important; }
    [data-pdf-itinerary-day]:not([data-pdf-keep-together="true"]) { break-inside: auto !important; page-break-inside: auto !important; }
    .pdf-flow-preview, .standard-quotation-document { max-width: none !important; margin: 0 !important; box-shadow: none !important; }
    /* Per-template density controls. They affect only voucher card interiors
       and gaps; page geometry is controlled separately by the PDF margins. */
    .voucher-page .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(1rem * var(--voucher-card-spacing-scale)) !important; }
    .voucher-page .itinerary-day > .flex, .voucher-page .itinerary-day article { padding: calc(.75rem * var(--voucher-card-padding-scale)) !important; }
    .civ-timeline-wrapper { padding-top: calc(5mm * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(5mm * var(--voucher-card-spacing-scale)) !important; }
    .civ-timeline-item { margin-bottom: calc(6mm * var(--voucher-card-spacing-scale)) !important; }
    .civ-day-service { padding: calc(5px * var(--voucher-card-padding-scale)) calc(6px * var(--voucher-card-padding-scale)) !important; }
    .tiv-body { padding: calc(16px * var(--voucher-card-padding-scale)) !important; }
    .tiv-card { padding: calc(12px * var(--voucher-card-padding-scale)) !important; }
    .tiv-row { padding-top: calc(12px * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(12px * var(--voucher-card-spacing-scale)) !important; }
    .tiv-service { margin-top: calc(7px * var(--voucher-card-spacing-scale)) !important; padding: calc(8px * var(--voucher-card-padding-scale)) calc(10px * var(--voucher-card-padding-scale)) !important; }
  `;
  source.prepend(exportStyles);
  source.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('srcset');
    image.crossOrigin = 'anonymous';
    image.src = pdfImageUrl(image.currentSrc || image.src);
  });
  rewriteBackgroundImages(source);
  document.body.appendChild(source);

  try {
    const images = [...source.querySelectorAll('img')];
    await Promise.race([
      Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; }))),
      new Promise((resolve) => window.setTimeout(resolve, 15000)),
    ]);
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = await html2canvas(source, {
      scale: 2,
      useCORS: true,
      backgroundColor,
      logging: false,
      windowWidth: source.scrollWidth,
    });
    const printWidth = 210 - (margin * 2);
    const pageHeightPx = Math.floor((canvas.width * (297 - topMargin)) / (printWidth * contentScale));
    const protectedRanges = options.keepSectionsTogether === false
      ? []
      : keepTogetherRanges(source, canvas, pageHeightPx);
    // Footer whitespace is a maximum, not a pre-reserved empty strip.
    const footerGapPercent = clamp(options.footerGapPercent, 0, 30, 10);
    const pageFillPercent = clamp(options.pageFillPercent, 60, 100 - footerGapPercent, 100 - footerGapPercent);
    let sourceY = 0;
    const pages = [];
    while (sourceY < canvas.height) {
      if (options.singlePage && pages.length >= 1) break;
      const maximumSliceEnd = Math.min(sourceY + pageHeightPx, canvas.height);
      const minimumSliceHeight = Math.max(8, Math.floor(pageHeightPx * 0.015));
      const overflowingRange = protectedRanges
        .filter((range) => range.start < maximumSliceEnd && range.end > maximumSliceEnd)
        .sort((left, right) => {
          if (left.priority !== right.priority) return left.priority - right.priority;
          // Prefer the latest/innermost boundary. This moves only the card
          // that crosses the page edge, rather than an enclosing section.
          return right.start - left.start || (left.end - left.start) - (right.end - right.start);
        })[0];
      // Generic PDF rule: never raster-slice a printable block. If a card,
      // row, page section, or itinerary day crosses the next A4 boundary,
      // move that complete block to the following page. Blocks taller than a
      // page are excluded while building ranges and keep flowing normally.
      const canMoveRange = overflowingRange?.start > sourceY + minimumSliceHeight;
      // Never shrink one PDF slice independently: it makes sections on that
      // page visibly narrower than the same sections on the previous page.
      // Keep a consistent A4 content width and move a complete protected block
      // to the following page when it would otherwise cross the boundary.
      const moveToNextPage = canMoveRange;
      const protectedStart = moveToNextPage
          ? overflowingRange.start
        : maximumSliceEnd;
      const sliceHeight = protectedStart - sourceY;
      const outputScale = contentScale;
      const naturalPageHeight = ((sliceHeight * printWidth) / canvas.width) * outputScale;
      const printableHeight = 297 - topMargin;
      const hasFollowingContent = protectedStart < canvas.height;
      // When a completed non-final page already occupies most of the sheet,
      // expand it vertically so the footer gap is no larger than 10%. This
      // uses the space that would otherwise be an empty white block, without
      // changing which cards belong on the page or splitting them.
      const canFillFooter = hasFollowingContent && naturalPageHeight >= printableHeight * 0.65;
      const verticalFillScale = canFillFooter
        ? Math.max(1, (printableHeight * (pageFillPercent / 100)) / naturalPageHeight)
        : 1;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      slice.getContext('2d').drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      pages.push({
        image: slice.toDataURL('image/jpeg', 0.98),
        x: margin + ((printWidth - (printWidth * outputScale)) / 2),
        width: printWidth * outputScale,
        height: naturalPageHeight * verticalFillScale,
      });
      sourceY += sliceHeight;
    }
    return { pages, margin, topMargin };
  } finally {
    source.remove();
  }
};

export async function createPdfBlobFromElement(element, prepareSource, options = {}) {
  const { pages, margin, topMargin } = await renderPdfPagesFromElement(element, prepareSource, options);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(page.image, 'JPEG', page.x ?? margin, topMargin, page.width, page.height, undefined, 'FAST');
  });
  return pdf.output('blob');
}

export async function downloadPdfFromElement(element, filename, prepareSource, options) {
  const blob = await createPdfBlobFromElement(element, prepareSource, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Print the prepared page images in the current document. Chrome can show an
// empty preview for an off-screen iframe, even after its image data has loaded.
export async function printPdfDocument(element, filename, prepareSource, options) {
  const { pages, margin, topMargin } = await renderPdfPagesFromElement(element, prepareSource, options);
  if (!pages.length) throw new Error('Document content is not ready yet.');

  const title = String(filename || 'Document').replace(/\.pdf$/i, '');
  const printRootId = `pdf-print-root-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const printRoot = document.createElement('div');
  printRoot.id = printRootId;
  printRoot.setAttribute('aria-hidden', 'true');
  Object.assign(printRoot.style, {
    // Match the capture target strategy above. The print stylesheet promotes
    // this node to the printable document, but it must remain paintable while
    // Chrome is preparing the preview images.
    position: 'absolute', left: '0', top: '0', width: '210mm', zIndex: '-1',
    pointerEvents: 'none', background: '#fff',
  });
  const printPages = pages.map((page, index) => `
    <section class="pdf-print-page"${index === pages.length - 1 ? ' data-last-page="true"' : ''}>
      <img src="${page.image}" style="margin:${topMargin}mm 0 0 ${page.x ?? margin}mm;width:${page.width}mm;height:${page.height}mm" alt="">
    </section>`).join('');
  printRoot.innerHTML = printPages;
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > *:not(#${printRootId}) { display: none !important; }
      body > #${printRootId} { display: block !important; position: static !important; width: 210mm !important; min-width: 210mm !important; background: #fff !important; }
      #${printRootId}, #${printRootId} * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      #${printRootId} .pdf-print-page { width: 210mm !important; height: 297mm !important; overflow: hidden !important; break-after: page !important; page-break-after: always !important; }
      #${printRootId} .pdf-print-page[data-last-page="true"] { break-after: auto !important; page-break-after: auto !important; }
      #${printRootId} .pdf-print-page img { display: block !important; object-fit: contain !important; }
    }
  `;

  // Chrome derives the default Save-to-PDF filename from this title.
  const previousDocumentTitle = document.title;
  document.title = title;
  document.head.appendChild(printStyle);
  document.body.appendChild(printRoot);

  try {
    const printImages = [...printRoot.querySelectorAll('img')];
    await Promise.all(printImages.map((image) => (
      image.complete ? Promise.resolve() : new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      })
    )));
    await Promise.all(printImages.map((image) => (
      typeof image.decode === 'function' ? image.decode().catch(() => undefined) : Promise.resolve()
    )));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const cleanUp = () => {
      document.title = previousDocumentTitle;
      printStyle.remove();
      printRoot.remove();
    };
    const handleAfterPrint = () => {
      window.clearTimeout(fallbackCleanUp);
      cleanUp();
    };
    const fallbackCleanUp = window.setTimeout(() => {
      window.removeEventListener('afterprint', handleAfterPrint);
      cleanUp();
    }, 60000);
    window.addEventListener('afterprint', handleAfterPrint, { once: true });
    window.focus();
    window.print();
  } catch (error) {
    document.title = previousDocumentTitle;
    printStyle.remove();
    printRoot.remove();
    throw error;
  }
}
