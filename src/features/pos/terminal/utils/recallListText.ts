/**
 * Recall list row text → a minimal order, used by the Recall details window only when the server returns no
 * details for the order. Moved out of PosRecallDetailsModal (2026-11-11, split of the saved-order windows).
 * Example row: "Order : 5 Ticket : 1 07:52:49 AM (DineIn) (CASH CUSTOMER) (Waiter) Section : UPSTAIR TableNo : T1 Amnt : 9.800"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseRecallListText = (orderDetailsStr: string | undefined, orderId: number | null | undefined): any => {
  if (!orderDetailsStr) return null;
  try {
    // E.g.: "Order : 5 Ticket : 1 07:52:49 AM (DineIn) (CASH CUSTOMER) (Waiter) Section : UPSTAIR TableNo : T1 Amnt : 9.800"
    const details = orderDetailsStr;
    
    const orderNoMatch = details.match(/Order\s*:\s*(\d+)/i);
    const ticketNoMatch = details.match(/Ticket\s*:\s*(\d+)/i);
    const amntMatch = details.match(/Amnt\s*:\s*([\d.]+)/i);
    const typeMatch = details.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i);
    const customerMatch = details.match(/\((CASH CUSTOMER|[^)]+)\)/gi);
    
    // Attempt to extract customer/waiter names (usually in parentheses)
    let customerName = "CASH CUSTOMER";
    let employeeName = "Waiter";
    if (customerMatch && customerMatch.length >= 2) {
      customerName = customerMatch[1].replace(/[()]/g, "");
      if (customerMatch.length >= 3) {
        employeeName = customerMatch[2].replace(/[()]/g, "");
      }
    }

    const orderNo = orderNoMatch ? orderNoMatch[1] : (orderId || "");
    const ticketNo = ticketNoMatch ? ticketNoMatch[1] : "";
    const netAmount = amntMatch ? parseFloat(amntMatch[1]) : 0;
    const orderType = typeMatch ? typeMatch[1] : "DineIn";
    
    // Parse date/time
    const timeMatch = details.match(/(\d{2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    const timeStr = timeMatch ? timeMatch[1] : new Date().toLocaleTimeString();

    // Create fallback lines (mocked based on total amount)
    const mockItems = [
      {
        productId: 1,
        productName: "Ordered Items",
        qty: 1,
        price: netAmount,
        netAmount: netAmount,
      }
    ];

    return {
      orderId: orderId || 0,
      orderNo,
      ticketNo,
      employeeName,
      customerName,
      orderTypeName: orderType,
      netAmount,
      voucherDate: timeStr,
      details: mockItems,
      deliveryDetails: details.toLowerCase().includes("delivery") ? {
        mobile: "33000033",
        customerName: "Delivery Customer",
        area: "Area 1",
        block: "10",
        road: "20",
        building: "30",
        flat: "40",
      } : undefined
    };
  } catch (e) {
    console.error("Failed to parse fallback details:", e);
    return null;
  }
};
