/**
 * Helper to match an order against search term and category in POS Recall, Settled, and Void modals.
 */
export const matchesOrderSearch = (
  order: { orderId: number; details?: string; [key: string]: any },
  searchValue: string,
  searchStatus: string
): boolean => {
  if (!searchValue || !searchValue.trim()) return true;
  const term = searchValue.trim().toLowerCase();
  const details = (order.details || "").toLowerCase();
  const numTerm = parseInt(term, 10);
  const isNumeric = !isNaN(numTerm) && /^\d+$/.test(term);

  const normalizedStatus = (searchStatus || "").toUpperCase().trim();

  switch (normalizedStatus) {
    case "ORDER NO":
    case "ORDER_NO":
    case "ORDERNO": {
      // 1. Direct orderId match
      if (order.orderId !== undefined && order.orderId !== null) {
        if (order.orderId.toString().includes(term)) return true;
        if (isNumeric && order.orderId === numTerm) return true;
      }
      // 2. Extract "Order : <val>" from details
      const orderMatch = details.match(/order\s*:\s*([^\s()]+)/i);
      if (orderMatch) {
        const extracted = orderMatch[1].toLowerCase();
        if (extracted.includes(term)) return true;
        if (isNumeric && parseInt(extracted, 10) === numTerm) return true;
      }
      // 3. Fallback check across details
      return details.includes(term);
    }

    case "TICKET NO":
    case "TICKET_NO":
    case "TICKETNO":
    case "Ticket No": {
      // 1. Extract "Ticket : <val>" from details
      const ticketMatch = details.match(/ticket\s*:\s*([^\s()]+)/i);
      if (ticketMatch) {
        const extracted = ticketMatch[1].toLowerCase();
        if (extracted.includes(term)) return true;
        if (isNumeric && parseInt(extracted, 10) === numTerm) return true;
      }
      // 2. Check ticketNo property if present
      if ((order as any).ticketNo !== undefined && (order as any).ticketNo !== null) {
        if ((order as any).ticketNo.toString().includes(term)) return true;
        if (isNumeric && Number((order as any).ticketNo) === numTerm) return true;
      }
      // 3. Fallback check across details
      return details.includes(term);
    }

    case "CUSTOMER":
    case "CUSTOMER NAME":
    case "Customer": {
      // 1. Explicit customer property if present
      const custName = ((order as any).customerName || (order as any).customer || "").toLowerCase();
      if (custName && custName.includes(term)) return true;

      // 2. Multi-word search across details
      const words = term.split(/\s+/).filter(Boolean);
      if (words.length > 0 && words.every((w) => details.includes(w))) return true;

      return details.includes(term);
    }

    case "VEHICLE NO":
    case "VEHICLE_NO":
    case "VEHICLENO":
    case "Vehicle No": {
      // 1. Explicit vehicle property if present
      const veh = ((order as any).vehicleNo || (order as any).vehicleCustomerName || "").toLowerCase();
      if (veh && veh.includes(term)) return true;

      // 2. Extract vehicle tag from details
      const vehicleMatch = details.match(/vehicle\s*:\s*([^\s()]+)/i);
      if (vehicleMatch && vehicleMatch[1].toLowerCase().includes(term)) return true;

      return details.includes(term);
    }

    case "MOBILE NO":
    case "MOBILE_NO":
    case "MOBILENO":
    case "Mobile No": {
      // 1. Explicit contact property if present
      const contact = ((order as any).contactNo || (order as any).mobileNo || (order as any).phone || "").toLowerCase();
      if (contact && contact.includes(term)) return true;

      // 2. Extract mobile tag from details
      const mobileMatch = details.match(/(?:mobile|phone|tel)\s*:\s*([^\s()]+)/i);
      if (mobileMatch && mobileMatch[1].toLowerCase().includes(term)) return true;

      return details.includes(term);
    }

    default: {
      const words = term.split(/\s+/).filter(Boolean);
      if (words.length > 0 && words.every((w) => details.includes(w))) return true;
      return details.includes(term) || (order.orderId ? order.orderId.toString().includes(term) : false);
    }
  }
};
