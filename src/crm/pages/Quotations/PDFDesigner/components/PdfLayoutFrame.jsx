import React, { useEffect, useRef, useState } from 'react';
import { pdfLayoutOptionsFromConfig } from '../../../../lib/directPdfDownload';

// Every quotation template is authored at this logical A4 preview width.  The
// frame is deliberately template-agnostic: new template components inherit the
// same ruler behaviour simply by being rendered inside it.
export const PDF_FLOW_LAYOUT_CSS = `
  .pdf-flow-preview .a4-page{width:595px!important;min-height:0!important;height:auto!important;margin:0!important;page-break-after:auto!important;break-after:auto!important;overflow:visible!important}
`;

export default function PdfLayoutFrame({ config, children, className = '', style = {}, fitWidth = false }) {
  // fitWidth: shrink the fixed 595px page to the width available on phones so
  // the whole document is visible without sideways scrolling. Off by default,
  // because the designer and template settings screens have their own zoom.
  const hostRef = useRef(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    if (!fitWidth) return undefined;
    const parent = hostRef.current?.parentElement;
    if (!parent) return undefined;
    const measure = () => {
      const cs = window.getComputedStyle(parent);
      const available = parent.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      setFit(available > 0 ? Math.min(1, available / 595) : 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [fitWidth]);

  const { margin, topMargin, contentScalePercent } = pdfLayoutOptionsFromConfig(config);
  const pxPerMillimetre = 595 / 210;
  const sideInset = margin * pxPerMillimetre;
  const topInset = topMargin * pxPerMillimetre;
  const safeAreaScale = (210 - (margin * 2)) / 210;
  const contentScale = safeAreaScale * (contentScalePercent / 100);
  const centredContentInset = (595 * safeAreaScale - (595 * contentScale)) / 2;

  return (
    <div ref={hostRef} className={`pdf-flow-preview relative bg-white ${className}`} style={{ width: 595, margin: '0 auto', boxShadow: '0 4px 16px rgba(15,23,42,0.16)', ...(fitWidth && fit < 1 ? { zoom: fit } : {}), ...style }}>
      <div className="pointer-events-none absolute z-10 border border-dashed border-blue-400/70" style={{ top: topInset, left: sideInset, right: sideInset, height: 48 }} aria-hidden="true" />
      <div style={{ paddingTop: topInset, paddingLeft: sideInset + centredContentInset, paddingRight: sideInset + centredContentInset }}>
        <div style={{ zoom: contentScale }}>
          <style>{PDF_FLOW_LAYOUT_CSS}</style>
          {children}
        </div>
      </div>
    </div>
  );
}
