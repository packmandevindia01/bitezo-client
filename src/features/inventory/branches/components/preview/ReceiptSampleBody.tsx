import { useEffect, useRef, useState } from "react";
import { generateGuestPrintHtml } from "../../../../pos/utils/guestPrintTemplate";

const SAMPLE_ITEMS = [
  { uniqueId: "sample", productId: 1, quantity: 1, price: 1, lineTotal: 1, product: { id: 1, name: "ITEM 123", price: 1 } },
];
const SAMPLE_DATA = { orderNo: "1", ticketNo: "1", waiter: "Staff", counter: "Main", orderType: "TakeOut", netAmount: 1, showCompanyHeader: false };

/** The bill between the header and footer lines, from the same template the POS prints. */
const ReceiptSampleBody = () => {
  const [html, setHtml] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    generateGuestPrintHtml(SAMPLE_ITEMS as never, SAMPLE_DATA as never)
      .then((result) => { if (active) setHtml(result); })
      .catch((err) => console.warn("[ReceiptSampleBody] Could not build the sample bill:", err));
    return () => { active = false; };
  }, []);

  const fitHeight = () => {
    const frame = frameRef.current;
    const height = frame?.contentDocument?.documentElement.scrollHeight;
    if (frame && height) frame.style.height = `${height}px`;
  };

  return (
    <iframe
      ref={frameRef}
      title="Sample bill"
      srcDoc={html}
      onLoad={fitHeight}
      className="block w-full border-0 pointer-events-none"
      style={{ height: 320 }}
      tabIndex={-1}
    />
  );
};

export default ReceiptSampleBody;
