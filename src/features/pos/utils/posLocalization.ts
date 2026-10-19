export type PosLanguageMode = "English" | "Arabic" | "Thai";
export type ProductViewMode = "English" | "Arabic" | "English and Arabic";

export const getPosLanguage = (): PosLanguageMode => {
  const direct = localStorage.getItem("posLanguage");
  if (direct && ["English", "Arabic", "Thai"].includes(direct)) {
    return direct as PosLanguageMode;
  }
  try {
    const raw = localStorage.getItem("posConfigs");
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = parsed?.configs?.posLanguage || parsed?.posLanguage || parsed?.configs?.PosLanguage || parsed?.PosLanguage;
      if (val && ["English", "Arabic", "Thai"].includes(val)) {
        return val as PosLanguageMode;
      }
    }
  } catch {}
  return "English";
};

export const getProductViewMode = (): ProductViewMode => {
  const direct = localStorage.getItem("productView");
  if (direct && ["English", "Arabic", "English and Arabic"].includes(direct)) {
    return direct as ProductViewMode;
  }
  try {
    const raw = localStorage.getItem("posConfigs");
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = parsed?.configs?.productView || parsed?.productView;
      if (val && ["English", "Arabic", "English and Arabic"].includes(val)) {
        return val as ProductViewMode;
      }
    }
  } catch {}
  return "English";
};

export interface LocalizedDisplayName {
  primary: string;
  secondary?: string;
}

/**
 * Returns the formatted display name(s) based on the Product View setting:
 * - "English": Show English name only (do not show Arabic).
 * - "Arabic": Show Arabic name only. If Arabic is missing/empty, fallback to English.
 * - "English and Arabic": Show English as primary, Arabic as secondary subtitle.
 */
export const getLocalizedName = (
  enName?: string,
  arName?: string,
  viewMode?: ProductViewMode
): LocalizedDisplayName => {
  const mode = viewMode || getProductViewMode();
  const en = (enName || "").trim();
  const ar = (arName || "").trim();

  if (mode === "Arabic") {
    // Show Arabic only. If Arabic not present, fallback to English.
    return {
      primary: ar || en,
      secondary: undefined,
    };
  }

  if (mode === "English and Arabic") {
    // Show both: primary English, secondary Arabic (if available and different)
    if (ar && ar !== en) {
      return {
        primary: en || ar,
        secondary: ar,
      };
    }
    return {
      primary: en || ar,
      secondary: undefined,
    };
  }

  // Default "English": show English only (suppress Arabic)
  return {
    primary: en || ar,
    secondary: undefined,
  };
};

/**
 * POS UI Translations Dictionary
 */
export const POS_TRANSLATIONS: Record<string, string> = {
  // Order Types
  "Dine In": "محلي",
  "DineIn": "محلي",
  "Take Out": "سفري",
  "TakeOut": "سفري",
  "Take Away": "سفري",
  "Takeaway": "سفري",
  "Drive Thru": "طلب سيارة",
  "DriveThru": "طلب سيارة",
  "Drive Through": "طلب سيارة",
  "Delivery": "توصيل",
  "Providers": "تطبيقات التوصيل",
  "Coming": "قادم",
  "Preorder": "طلب مسبق",

  // Top Nav & Actions
  "Customer": "العميل",
  "Cash Customer": "عميل نقدي",
  "Select Customer": "اختيار عميل",
  "Assigned Customer": "العميل المحدد",
  "Waiter": "النادل",
  "Select Waiter": "اختيار نادل",
  "Assigned Waiter": "النادل المحدد",
  "Table": "طاولة",
  "Clear": "مسح",
  "Split": "تقسيم",
  "Combine": "دمج",
  "Recall": "استرجاع",
  "More": "المزيد",

  // Cart Table Headers
  "ITEM": "الصنف",
  "QTY": "الكمية",
  "PRICE": "السعر",
  "TOTAL": "المجموع",
  "Active order is empty": "الطلب الحالي فارغ",

  // Cart Financials
  "Sub Total": "المجموع الفرعي",
  "Discount": "الخصم",
  "Charges": "الرسوم",
  "Net Value": "القيمة الصافية",
  "Delivery Charge": "رسوم التوصيل",
  "VAT": "الضريبة",
  "Grand Total": "المجموع الكلي",

  // Cart Action Buttons
  "COM": "مجاني",
  "Settle": "سداد",
  "Settle &": "سداد و",
  "Print": "طباعة",
  "Order": "طلب",
  "Order &": "طلب و",
  "Wait...": "انتظر...",

  // Payment Modes
  "Cash": "نقدي",
  "CASH": "نقدي",
  "Card": "بطاقة",
  "CARD": "بطاقة",
  "Credit": "آجل",
  "CREDIT": "آجل",
  "Multi": "دفع متعدد",
  "MULTI": "دفع متعدد",
  "MultiPay": "دفع متعدد",
  "MULTIPAY": "دفع متعدد",
  "Multipay": "دفع متعدد",
  "Multi Pay": "دفع متعدد",
  "MULTI PAY": "دفع متعدد",

  // Quick Cart Action Line Buttons & Titles
  "Qty": "الكمية",
  "Quantity": "الكمية",
  "Price": "السعر",
  "DISCOUNT": "الخصم",
  "Void": "إلغاء",
  "VOID": "إلغاء",
  "Msg": "ملاحظة",
  "MSG": "ملاحظة",
  "Message": "ملاحظة",
  "Qty -": "كمية -",
  "QTY -": "كمية -",
  "Qty +": "كمية +",
  "QTY +": "كمية +",
  "Mod": "تعديل",
  "MOD": "تعديل",
  "Modifier": "تعديل",
  "Extra": "إضافات",
  "EXTRA": "إضافات",
  "Extras": "إضافات",
  "EXTRAS": "إضافات",
  "Manual Quantity": "الكمية يدوياً",
  "Change Price": "تغيير السعر",
  "Apply Discount": "تطبيق خصم",
  "Void selected item": "إلغاء الصنف المحدد",
  "Add Message": "إضافة ملاحظة",
  "Decrease quantity": "تقليل الكمية",
  "Increase quantity": "زيادة الكمية",

  // Recall Modal
  "All": "الكل",
  "Including Delivery Out": "يشمل الخارج للتوصيل",
  "Delivery Out Only": "الخارج للتوصيل فقط",
  "Include Cancelled": "يشمل الملغي",
  "Cancelled": "ملغي",
  "CANCELLED": "ملغي",
  "Search...": "بحث...",
  "No orders found": "لا توجد طلبات",
  "ORDER NO": "رقم الطلب",
  "Order No": "رقم الطلب",
  "TIME": "الوقت",
  "Time": "الوقت",
  "AMOUNT": "المبلغ",
  "Amount": "المبلغ",
  "STATUS": "الحالة",
  "Status": "الحالة",
  "DRIVER": "السائق",
  "Driver": "السائق",
  "ITEMS": "الأصناف",
  "Items": "الأصناف",
  "ACTIONS": "الإجراءات",
  "Actions": "الإجراءات",

  // POS More Modal Headers & Sections
  "ORDERS": "الطلبات",
  "CASHIER & REGISTER": "الكاشير والصندوق",
  "SYSTEM & HARDWARE": "النظام والأجهزة",
  "Sales & Customers": "المبيعات والعملاء",
  "Orders & Dining": "الطلبات والصالة",
  "Cashier & Register": "الكاشير والصندوق",
  "Shift Services": "خدمات الوردية",
  "Discounts & Inventory": "الخصومات والمخزون",
  "Offers & 86": "العروض وقفل الأصناف",
  "System & Administration": "النظام والإدارة",
  "Setup & Devices": "الإعدادات والأجهزة",
  "Configuration & Operations": "الإعدادات والعمليات",
  "Quick actions, cashier shift tools, hardware & backoffice controls": "إجراءات سريعة، أدوات الوردية، الأجهزة وإدارة النظام",
  "REPORT": "التقارير",
  "Shift summaries, sales audit & operational reports": "ملخصات الوردية وتدقيق المبيعات والتقارير",
  "Close register & count shift drawer": "إغلاق الوردية وجرد صندوق الكاشير",
  "ITEM COMPLIMENTARY": "صنف مجاني",
  "Mark selected order item as 100% off": "تطبيق خصم 100% على الصنف المحدد",
  "BILL COMPLIMENTARY": "فاتورة مجانية",
  "Apply 100% complimentary to bill": "تطبيق ضيافة مجانية 100% على الفاتورة",
  "LOCK PRODUCTS": "قفل الأصناف",
  "Temporarily 86 out-of-stock menu items": "قفل الأصناف المنتهية مؤقتًا من القائمة",
  "BACK OFFICE": "لوحة التحكم",
  "Open full backoffice management portal": "فتح بوابة إدارة النظام الخلفية",
  "POS CONFIGURATION": "إعدادات نقطة البيع",
  "Terminal settings & operational rules": "إعدادات الجهاز والقواعد التشغيلية",
  "PRINTER SETTINGS": "إعدادات الطابعة",
  "Hardware receipt & kitchen printers": "طابعات الفواتير وإيصالات المطبخ",

  // POS More Actions
  "SETTLED ORDERS": "الفواتير المسددة",
  "View and reprint settled invoices": "عرض وإعادة طباعة الفواتير المسددة",
  "VOID ORDER": "إلغاء الطلب",
  "Cancel all items & void active order": "إلغاء جميع الأصناف وإلغاء الطلب الحالي",
  "CUSTOMER MASTER": "بيانات العملاء",
  "Search or add customer accounts": "بحث وإضافة حسابات العملاء",
  "SET MENU DINE-IN": "إدارة الصالة",
  "Floor plan & dining table orders": "مخطط الصالة وطلبات الطاولات",
  "BULK SETTLEMENT": "تسوية مجمعة",
  "Settle driver & provider pending orders": "تسوية طلبات السائقين وتطبيقات التوصيل",
  "PAY IN / PAY OUT": "إيداع / سحب",
  "Petty cash drawer float & payout": "حركة الصندوق النثري (إيداع وسحب)",
  "CASHIER OUT": "إغلاق الكاشير",
  "Shift reconciliation & settlement": "تقرير وتسليم وردية الكاشير",
  "POS REPORTS": "تقارير نقطة البيع",
  "Sales, items & shift analytics": "تقارير المبيعات والأصناف والورديات",
  "REPRINT LAST KOT": "إعادة طباعة آخر KOT",
  "Send previous kitchen ticket to printer": "إعادة طباعة آخر تذكرة مطبخ",
  "PRINTER SETUP": "إعدادات الطابعة",
  "Configure receipts, KOT & network IP": "تكوين طابعات الفواتير والمطبخ والشبكة",
  "LOCK SCREEN": "قفل الشاشة",
  "Secure terminal without ending shift": "قفل شاشة نقطة البيع دون إنهاء الوردية",
  "BACKOFFICE": "لوحة التحكم",
  "Return to main backoffice dashboard": "العودة إلى لوحة تحكم الإدارة",
  "LOCK ITEMS": "قفل الأصناف",
  "Lock or unlock menu products in POS": "قفل أو فتح أصناف القائمة في الكاشير",

  // Search & Inputs
  "Search menu items...": "البحث في أصناف القائمة...",
  "Search categories...": "البحث في الأقسام...",
  "Sub Category": "القسم الفرعي",
  "Variations": "الخيارات",

  // Recall Details & Actions
  "EDIT": "تعديل",
  "SETTLE": "سداد",
  "CLOSE": "إغلاق",
  "GUEST": "الضيف",
  "Service Charge": "رسوم الخدمة",
  "Delivery Details": "بيانات التوصيل",
  "Mobile": "الجوال",
  "Flat No": "رقم الشقة",
  "Building": "المبنى",
  "Block": "المجمع",
  "Road": "الشارع",
  "Area": "المنطقة",
  "Keep Change": "الباقي",
  "No Order Data Available": "لا توجد بيانات للطلب",

  // Cash Settlement & Payment Dialogs
  "Cash Settlement": "سداد نقدي",
  "Total Due": "المبلغ المستحق",
  "Amount Paid": "المبلغ المدفوع",
  "Change": "الباقي",
  "Short By": "المتبقي",
  "Amount Tendered": "المبلغ المستلم",
  "Pay": "دفع",
  "Cancel": "إلغاء",
  "Save": "حفظ",
  "Apply": "تطبيق",
  "Done": "تم",
  "Submit": "إرسال",

  // Discount & Keypad Dialogs
  "Discount Type": "نوع الخصم",
  "Whole Order": "كامل الطلب",
  "Bill Wise": "حسب الفاتورة",
  "Global Bill Reduction": "خصم على إجمالي الفاتورة",
  "Item Wise": "حسب الصنف",
  "Specific Product Reduction": "خصم على صنف محدد",

  // Waiter & Void Dialogs
  "Select Waiter / Employee": "اختيار النادل / الموظف",
  "Unassign Waiter": "إلغاء تعيين النادل",
  "Refresh": "تحديث",
  "Active Order Waiter": "نادل الطلب الحالي",
  "Employee": "موظف",
  "Employees": "موظفين",
  "Reason for Voiding": "سبب الإلغاء",
  "Enter reason...": "أدخل السبب...",

  // Settled Orders & Details
  "ORDER DETAILS": "تفاصيل الطلب",
  "Order Details": "تفاصيل الطلب",
  "PRINT": "طباعة",
  "Printed": "تمت الطباعة",
  "Invoice": "الفاتورة",
  "Emp": "الموظف",
  "Type": "النوع",
  "Vehicle": "المركبة",
  "Note": "ملاحظة",
  "Item": "الصنف",
  "Total": "المجموع",
  "SETTLED ORDER TICKET": "تذكرة الطلب المسدد",
  "BITEZO POS": "نقطة بيع بيتزو",

  // POS Configuration Page & Tabs
  "POS Configuration": "إعدادات نقطة البيع",
  "General POS Settings": "الإعدادات العامة لنقطة البيع",
  "KOT & Printing Routing": "توجيه طلبات المطبخ والطباعة",
  "Additional Charges & Fees": "الرسوم والمبالغ الإضافية",
  "Day End Closing Rules": "قواعد إغلاق نهاية اليوم",
  "POS Settings": "إعدادات نقطة البيع",
  "KOT & Printing": "المطبخ والطباعة",
  "Charges & Delivery": "الرسوم والتوصيل",
  "Day End": "نهاية اليوم",
  "Save Changes": "حفظ التغييرات",
  "General POS": "الإعدادات العامة",
  "Operational Flags": "خيارات التشغيل",
  "Company Name (KOT)": "اسم الشركة (المطبخ)",
  "Enable VAT (Guest Print)": "تفعيل الضريبة (طباعة الضيف)",
  "Location Wise Price": "السعر حسب الموقع",
  "Alternative Price": "السعر البديل",
  "Default Order Type": "نوع الطلب الافتراضي",
  "Default Employee": "الموظف الافتراضي",
  "Select employee": "اختيار موظف",
  "Group in Menu": "المجموعات في القائمة",
  "Discount Calculation": "حساب الخصم",
  "Price View": "عرض السعر",
  "POS Language": "لغة نقطة البيع",
  "Product View": "عرض الأصناف",
  "Cashdrawer Type": "نوع درج النقد",
  "Print Price": "طباعة السعر",
  "Item Separation": "فصل الأصناف",
  "Enable Recipe": "تفعيل الوصفات",
  "Enable Day Date": "تفعيل تاريخ اليوم",
  "Multi Employee (Table)": "موظفون متعددون (طاولة)",
  "Customer (Takeout)": "عميل (سفري)",
  "Delivery Settle": "تسوية التوصيل",
  "Show Delivery (Recall)": "إظهار التوصيل (استرجاع)",
  "Provider Own Menu Status": "حالة قائمة تطبيقات التوصيل",
  "Inclusive": "شامل",
  "Exclusive": "غير شامل",
  "Default": "افتراضي",
  "Normal": "عادي",
  "English": "الإنجليزية",
  "Arabic": "العربية",
  "English and Arabic": "الإنجليزية والعربية",
  "Id": "المعرف",
  "Name": "الاسم",

  // Printing Tab
  "KOT Settings": "إعدادات طلب المطبخ",
  "Bill & Printing": "الفاتورة والطباعة",
  "Bill & Packager": "الفاتورة والتغليف",
  "KOT Header Style": "نمط رأس تذكرة المطبخ",
  "KOT Arabic": "تذكرة المطبخ بالعربية",
  "KOT Print (Settle)": "طباعة المطبخ عند السداد",
  "Standard KOT Print": "طباعة المطبخ القياسية",
  "Other Kitchen Items (KOT)": "أصناف المطبخ الأخرى (KOT)",
  "OTHER ITEMS": "الأصناف الأخرى",
  "Other Items": "الأصناف الأخرى",
  "Bill Copies": "عدد نسخ الفاتورة",
  "Packager Print": "طباعة التغليف",
  "Packager Header": "رأس تذكرة التغليف",
  "Caller ID Port": "منفذ هوية المتصل",
  "Display Port": "منفذ شاشة العرض",
  "Master KOT": "تذكرة المطبخ الرئيسية",
  "Master KOT (Bill Printer)": "طابعة فاتورة المطبخ الرئيسية",
  "Master KOT Bill Printer": "طابعة فاتورة المطبخ الرئيسية",
  "Item Separation (After Edit)": "فصل الأصناف (بعد التعديل)",
  "Color Change (Guest Print)": "تغيير اللون (طباعة الضيف)",
  "Bill Arabic": "الفاتورة بالعربية",
  "Device Ports": "منافذ الأجهزة",

  // Charges Tab
  "Global Percentage Charges": "نسب الرسوم العامة",
  "Service Charge (%)": "رسوم الخدمة (%)",
  "Levy (%)": "الضريبة الإضافية (%)",
  "Default Delivery Charge": "رسوم التوصيل الافتراضية",
  "Multi Delivery Zones": "مناطق التوصيل المتعددة",
  "Multi Delivery Charges": "رسوم التوصيل المتعددة",
  "Zone/Charge Name": "اسم المنطقة / الرسم",
  "e.g. Zone 1, Remote...": "مثال: المنطقة 1...",
  "Add Zone": "إضافة منطقة",
  "Add Charge": "إضافة رسم",
  "Charge Name": "اسم الرسم",

  // Day End Tab
  "Day End Requirements": "متطلبات إغلاق نهاية اليوم",
  "Configure which entities must be settled or checked before performing a Day End.": "تحديد العمليات التي يجب تسويتها قبل إغلاق نهاية اليوم.",
  "Category": "القسم",
  "Voucher Entry": "قيود السندات",
  "Order Type": "نوع الطلب",
  "Void Item": "الأصناف الملغاة",
  "Denomination": "فئات النقد",
  "Product": "الصنف",
  "Group": "المجموعة",

  // Top Nav & Common Statuses
  "Search product by name...": "البحث عن صنف بالاسم...",
  "Ticket": "تذكرة",
  "Section": "القسم",
  "New": "جديد",
  "Active": "نشط",
  "Thai": "التايلاندية",
};

/**
 * POS UI Thai Translations Dictionary
 */
export const POS_THAI_TRANSLATIONS: Record<string, string> = {
  // Order Types
  "Dine In": "ทานที่ร้าน",
  "DineIn": "ทานที่ร้าน",
  "Take Out": "สั่งกลับบ้าน",
  "TakeOut": "สั่งกลับบ้าน",
  "Take Away": "สั่งกลับบ้าน",
  "Takeaway": "สั่งกลับบ้าน",
  "Drive Thru": "ไดร์ฟทรู",
  "DriveThru": "ไดร์ฟทรู",
  "Drive Through": "ไดร์ฟทรู",
  "Delivery": "เดลิเวอรี",
  "Providers": "ผู้ให้บริการ",
  "Coming": "กำลังมา",
  "Preorder": "สั่งล่วงหน้า",

  // Top Nav & Actions
  "Customer": "ลูกค้า",
  "Cash Customer": "ลูกค้าทั่วไป",
  "Select Customer": "เลือกลูกค้า",
  "Assigned Customer": "ลูกค้าที่เลือก",
  "Waiter": "พนักงานเสิร์ฟ",
  "Select Waiter": "เลือกพนักงานเสิร์ฟ",
  "Assigned Waiter": "พนักงานเสิร์ฟที่เลือก",
  "Table": "โต๊ะ",
  "Clear": "ล้าง",
  "Split": "แยกบิล",
  "Combine": "รวมบิล",
  "Recall": "เรียกคืน",
  "More": "เพิ่มเติม",

  // Cart Table Headers
  "ITEM": "รายการ",
  "QTY": "จำนวน",
  "PRICE": "ราคา",
  "TOTAL": "รวม",
  "Active order is empty": "ไม่มีรายการสั่งซื้อ",

  // Cart Financials
  "Sub Total": "ยอดรวมย่อย",
  "Discount": "ส่วนลด",
  "Charges": "ค่าธรรมเนียม",
  "Net Value": "มูลค่าสุทธิ",
  "Delivery Charge": "ค่าจัดส่ง",
  "VAT": "ภาษีมูลค่าเพิ่ม",
  "Grand Total": "ยอดรวมทั้งสิ้น",

  // Cart Action Buttons
  "COM": "ฟรี",
  "Settle": "ชำระเงิน",
  "Settle &": "ชำระและ",
  "Print": "พิมพ์",
  "Order": "สั่งซื้อ",
  "Order &": "สั่งซื้อและ",
  "Wait...": "กรุณารอสักครู่...",

  // Payment Modes
  "Cash": "เงินสด",
  "CASH": "เงินสด",
  "Card": "บัตร",
  "CARD": "บัตร",
  "Credit": "เครดิต",
  "CREDIT": "เครดิต",
  "Multi": "ชำระหลายช่องทาง",
  "MULTI": "ชำระหลายช่องทาง",
  "MultiPay": "ชำระหลายช่องทาง",
  "MULTIPAY": "ชำระหลายช่องทาง",
  "Multipay": "ชำระหลายช่องทาง",
  "Multi Pay": "ชำระหลายช่องทาง",
  "MULTI PAY": "ชำระหลายช่องทาง",

  // Quick Cart Action Line Buttons & Titles
  "Qty": "จำนวน",
  "Quantity": "จำนวน",
  "Price": "ราคา",
  "DISCOUNT": "ส่วนลด",
  "Void": "ยกเลิก",
  "VOID": "ยกเลิก",
  "Msg": "ข้อความ",
  "MSG": "ข้อความ",
  "Message": "ข้อความ",
  "Qty -": "ลดจำนวน",
  "QTY -": "ลดจำนวน",
  "Qty +": "เพิ่มจำนวน",
  "QTY +": "เพิ่มจำนวน",
  "Mod": "ปรับแต่ง",
  "MOD": "ปรับแต่ง",
  "Modifier": "ตัวปรับแต่ง",
  "Extra": "เพิ่มเติม",
  "EXTRA": "เพิ่มเติม",
  "Extras": "เพิ่มเติม",
  "EXTRAS": "เพิ่มเติม",
  "Manual Quantity": "ระบุจำนวน",
  "Change Price": "เปลี่ยนราคา",
  "Apply Discount": "ใช้ส่วนลด",
  "Void selected item": "ยกเลิกรายการที่เลือก",
  "Add Message": "เพิ่มข้อความ",
  "Decrease quantity": "ลดจำนวน",
  "Increase quantity": "เพิ่มจำนวน",

  // Recall Modal
  "All": "ทั้งหมด",
  "Including Delivery Out": "รวมกำลังจัดส่ง",
  "Delivery Out Only": "กำลังจัดส่งเท่านั้น",
  "Include Cancelled": "รวมรายการที่ยกเลิก",
  "Cancelled": "ยกเลิกแล้ว",
  "CANCELLED": "ยกเลิกแล้ว",
  "Search...": "ค้นหา...",
  "No orders found": "ไม่พบรายการสั่งซื้อ",
  "ORDER NO": "หมายเลขออเดอร์",
  "Order No": "หมายเลขออเดอร์",
  "TIME": "เวลา",
  "Time": "เวลา",
  "AMOUNT": "ยอดเงิน",
  "Amount": "ยอดเงิน",
  "STATUS": "สถานะ",
  "Status": "สถานะ",
  "DRIVER": "พนักงานจัดส่ง",
  "Driver": "พนักงานจัดส่ง",
  "ITEMS": "รายการ",
  "Items": "รายการ",
  "ACTIONS": "การดำเนินการ",
  "Actions": "การดำเนินการ",

  // POS More Modal Headers & Sections
  "ORDERS": "คำสั่งซื้อ",
  "CASHIER & REGISTER": "แคชเชียร์และกะ",
  "SYSTEM & HARDWARE": "ระบบและอุปกรณ์",
  "Sales & Customers": "การขายและลูกค้า",
  "Orders & Dining": "คำสั่งซื้อและโต๊ะ",
  "Cashier & Register": "แคชเชียร์และกะ",
  "Shift Services": "บริการกะ",
  "Discounts & Inventory": "ส่วนลดและสินค้าคงคลัง",
  "Offers & 86": "โปรโมชั่นและสินค้าหมด",
  "System & Administration": "ระบบและการดูแล",
  "Setup & Devices": "การตั้งค่าและอุปกรณ์",
  "Configuration & Operations": "การตั้งค่าและการดำเนินงาน",
  "Quick actions, cashier shift tools, hardware & backoffice controls": "คำสั่งด่วน เครื่องมือแคชเชียร์ อุปกรณ์ และการควบคุมระบบหลังบ้าน",
  "REPORT": "รายงาน",
  "Shift summaries, sales audit & operational reports": "สรุปกะ ตรวจสอบยอดขาย และรายงานการดำเนินงาน",
  "Close register & count shift drawer": "ปิดกะและนับเงินในลิ้นชัก",
  "ITEM COMPLIMENTARY": "อภินันทนาการรายการ",
  "Mark selected order item as 100% off": "ลด 100% สำหรับรายการที่เลือก",
  "BILL COMPLIMENTARY": "อภินันทนาการทั้งบิล",
  "Apply 100% complimentary to bill": "ลด 100% สำหรับบิลนี้",
  "LOCK PRODUCTS": "ล็อคสินค้า",
  "Temporarily 86 out-of-stock menu items": "ล็อคเมนูที่สินค้าหมดชั่วคราว",
  "BACK OFFICE": "ระบบหลังบ้าน",
  "Open full backoffice management portal": "เปิดพอร์ทัลจัดการระบบหลังบ้าน",
  "POS CONFIGURATION": "การตั้งค่า POS",
  "Terminal settings & operational rules": "การตั้งค่าเครื่องและกฎการดำเนินงาน",
  "PRINTER SETTINGS": "การตั้งค่าเครื่องพิมพ์",
  "Hardware receipt & kitchen printers": "เครื่องพิมพ์ใบเสร็จและเครื่องพิมพ์ในครัว",

  // POS More Actions
  "SETTLED ORDERS": "บิลที่ชำระแล้ว",
  "View and reprint settled invoices": "ดูและพิมพ์ใบเสร็จที่ชำระแล้วซ้ำ",
  "VOID ORDER": "ยกเลิกออเดอร์",
  "Cancel all items & void active order": "ยกเลิกทุกรายการและยกเลิกออเดอร์ปัจจุบัน",
  "CUSTOMER MASTER": "ข้อมูลลูกค้า",
  "Search or add customer accounts": "ค้นหาหรือเพิ่มบัญชีลูกค้า",
  "SET MENU DINE-IN": "จัดการโต๊ะอาหาร",
  "Floor plan & dining table orders": "ผังร้านและคำสั่งซื้อตามโต๊ะ",
  "BULK SETTLEMENT": "ชำระเงินรวม",
  "Settle driver & provider pending orders": "ชำระเงินออเดอร์คนส่งและเดลิเวอรีค้างชำระ",
  "PAY IN / PAY OUT": "นำเงินเข้า / นำเงินออก",
  "Petty cash drawer float & payout": "เงินสดย่อยในลิ้นชักและเบิกจ่าย",
  "CASHIER OUT": "ปิดกะแคชเชียร์",
  "Shift reconciliation & settlement": "กระทบยอดและสรุปปิดกะแคชเชียร์",
  "POS REPORTS": "รายงาน POS",
  "Sales, items & shift analytics": "วิเคราะห์ยอดขาย สินค้า และกะ",
  "REPRINT LAST KOT": "พิมพ์ KOT ล่าสุดซ้ำ",
  "Send previous kitchen ticket to printer": "ส่งใบสั่งครัวล่าสุดไปยังเครื่องพิมพ์",
  "PRINTER SETUP": "ตั้งค่าเครื่องพิมพ์",
  "Configure receipts, KOT & network IP": "ตั้งค่าใบเสร็จ, KOT และ IP เครือข่าย",
  "LOCK SCREEN": "ล็อคหน้าจอ",
  "Secure terminal without ending shift": "ล็อคเครื่องโดยไม่ปิดกะ",
  "BACKOFFICE": "ระบบหลังบ้าน",
  "Return to main backoffice dashboard": "กลับสู่แดชบอร์ดระบบหลังบ้าน",
  "LOCK ITEMS": "ล็อคสินค้า",
  "Lock or unlock menu products in POS": "ล็อคหรือปลดล็อคเมนูสินค้าใน POS",

  // Search & Inputs
  "Search menu items...": "ค้นหาเมนู...",
  "Search categories...": "ค้นหาหมวดหมู่...",
  "Sub Category": "หมวดหมู่ย่อย",
  "Variations": "ตัวเลือก",

  // Recall Details & Actions
  "EDIT": "แก้ไข",
  "SETTLE": "ชำระเงิน",
  "CLOSE": "ปิด",
  "GUEST": "ลูกค้า",
  "Service Charge": "ค่าบริการ",
  "Delivery Details": "รายละเอียดการจัดส่ง",
  "Mobile": "เบอร์โทรศัพท์",
  "Flat No": "ห้องเลขที่",
  "Building": "อาคาร",
  "Block": "บล็อก",
  "Road": "ถนน",
  "Area": "พื้นที่",
  "Keep Change": "เงินทอน",
  "No Order Data Available": "ไม่มีข้อมูลคำสั่งซื้อ",

  // Cash Settlement & Payment Dialogs
  "Cash Settlement": "ชำระเงินสด",
  "Total Due": "ยอดที่ต้องชำระ",
  "Amount Paid": "ยอดที่ชำระแล้ว",
  "Change": "เงินทอน",
  "Short By": "ขาดอีก",
  "Amount Tendered": "ยอดเงินที่รับมา",
  "Pay": "จ่าย",
  "Cancel": "ยกเลิก",
  "Save": "บันทึก",
  "Apply": "นำไปใช้",
  "Done": "เสร็จสิ้น",
  "Submit": "ยืนยัน",

  // Discount & Keypad Dialogs
  "Discount Type": "ประเภทส่วนลด",
  "Whole Order": "ทั้งออเดอร์",
  "Bill Wise": "ตามบิล",
  "Global Bill Reduction": "ลดทั้งบิล",
  "Item Wise": "ตามรายการ",
  "Specific Product Reduction": "ลดเฉพาะสินค้า",

  // Waiter & Void Dialogs
  "Select Waiter / Employee": "เลือกพนักงานเสิร์ฟ / พนักงาน",
  "Unassign Waiter": "ยกเลิกพนักงานเสิร์ฟ",
  "Refresh": "รีเฟรช",
  "Active Order Waiter": "พนักงานเสิร์ฟออเดอร์นี้",
  "Employee": "พนักงาน",
  "Employees": "พนักงาน",
  "Reason for Voiding": "เหตุผลในการยกเลิก",
  "Enter reason...": "ระบุเหตุผล...",

  // Settled Orders & Details
  "ORDER DETAILS": "รายละเอียดคำสั่งซื้อ",
  "Order Details": "รายละเอียดคำสั่งซื้อ",
  "PRINT": "พิมพ์",
  "Printed": "พิมพ์แล้ว",
  "Invoice": "ใบแจ้งหนี้",
  "Emp": "พนักงาน",
  "Type": "ประเภท",
  "Vehicle": "ยานพาหนะ",
  "Note": "หมายเหตุ",
  "Item": "รายการ",
  "Total": "รวม",
  "SETTLED ORDER TICKET": "ใบเสร็จคำสั่งซื้อที่ชำระแล้ว",
  "BITEZO POS": "ไบทโซ POS",

  // POS Configuration Page & Tabs
  "POS Configuration": "การตั้งค่า POS",
  "General POS Settings": "การตั้งค่าทั่วไปของ POS",
  "KOT & Printing Routing": "การพิมพ์ KOT และใบเสร็จ",
  "Additional Charges & Fees": "ค่าธรรมเนียมและค่าบริการเพิ่มเติม",
  "Day End Closing Rules": "กฎการปิดสิ้นวัน",
  "POS Settings": "การตั้งค่า POS",
  "KOT & Printing": "KOT และการพิมพ์",
  "Charges & Delivery": "ค่าบริการและการจัดส่ง",
  "Day End": "สิ้นวัน",
  "Save Changes": "บันทึกการเปลี่ยนแปลง",
  "General POS": "POS ทั่วไป",
  "Operational Flags": "การตั้งค่าการทำงาน",
  "Company Name (KOT)": "ชื่อบริษัท (KOT)",
  "Enable VAT (Guest Print)": "เปิดใช้ VAT (ใบแจ้งหนี้ชั่วคราว)",
  "Location Wise Price": "ราคาตามสาขา",
  "Alternative Price": "ราคาทางเลือก",
  "Default Order Type": "ประเภทคำสั่งซื้อเริ่มต้น",
  "Default Employee": "พนักงานเริ่มต้น",
  "Select employee": "เลือกพนักงาน",
  "Group in Menu": "จัดกลุ่มในเมนู",
  "Discount Calculation": "การคำนวณส่วนลด",
  "Price View": "การแสดงราคา",
  "POS Language": "ภาษาของ POS",
  "Product View": "การแสดงสินค้า",
  "Cashdrawer Type": "ประเภทลิ้นชักเก็บเงิน",
  "Print Price": "พิมพ์ราคา",
  "Item Separation": "แยกรายการสินค้า",
  "Enable Recipe": "เปิดใช้สูตรอาหาร",
  "Enable Day Date": "เปิดใช้วันที่ประจำวัน",
  "Multi Employee (Table)": "พนักงานหลายคน (โต๊ะ)",
  "Customer (Takeout)": "ลูกค้า (สั่งกลับบ้าน)",
  "Delivery Settle": "ชำระเงินเดลิเวอรี",
  "Show Delivery (Recall)": "แสดงเดลิเวอรี (เรียกคืน)",
  "Provider Own Menu Status": "สถานะเมนูของผู้ให้บริการ",
  "Inclusive": "รวมในราคา",
  "Exclusive": "ไม่รวมในราคา",
  "Default": "ค่าเริ่มต้น",
  "Normal": "ปกติ",
  "English": "อังกฤษ (English)",
  "Arabic": "อาหรับ (العربية)",
  "Thai": "ไทย (Thai)",
  "English and Arabic": "อังกฤษและอาหรับ",
  "Id": "รหัส",
  "Name": "ชื่อ",

  // Printing Tab
  "KOT Settings": "การตั้งค่า KOT",
  "Bill & Printing": "บิลและการพิมพ์",
  "Bill & Packager": "บิลและผู้แพ็คเกจ",
  "KOT Header Style": "รูปแบบหัว KOT",
  "KOT Arabic": "KOT ภาษาอาหรับ",
  "KOT Print (Settle)": "พิมพ์ KOT เมื่อชำระเงิน",
  "Standard KOT Print": "พิมพ์ KOT มาตรฐาน",
  "Other Kitchen Items (KOT)": "รายการครัวอื่นๆ (KOT)",
  "OTHER ITEMS": "รายการอื่นๆ",
  "Other Items": "รายการอื่นๆ",
  "Bill Copies": "จำนวนสำเนาบิล",
  "Packager Print": "พิมพ์ใบแพ็ค",
  "Packager Header": "หัวใบแพ็ค",
  "Caller ID Port": "พอร์ต Caller ID",
  "Display Port": "พอร์ตจอแสดงผล",
  "Master KOT": "Master KOT",
  "Master KOT (Bill Printer)": "Master KOT (เครื่องพิมพ์บิล)",
  "Master KOT Bill Printer": "เครื่องพิมพ์บิล Master KOT",
  "Item Separation (After Edit)": "แยกรายการ (หลังแก้ไข)",
  "Color Change (Guest Print)": "เปลี่ยนสี (ใบแจ้งหนี้ชั่วคราว)",
  "Bill Arabic": "บิลภาษาอาหรับ",
  "Device Ports": "พอร์ตอุปกรณ์",

  // Charges Tab
  "Global Percentage Charges": "ค่าบริการคิดเป็นเปอร์เซ็นต์",
  "Service Charge (%)": "ค่าบริการ (%)",
  "Levy (%)": "ค่าธรรมเนียมพิเศษ (%)",
  "Default Delivery Charge": "ค่าจัดส่งเริ่มต้น",
  "Multi Delivery Zones": "โซนจัดส่งหลายโซน",
  "Multi Delivery Charges": "ค่าจัดส่งหลายอัตรา",
  "Zone/Charge Name": "ชื่อโซน / ค่าบริการ",
  "e.g. Zone 1, Remote...": "เช่น โซน 1, นอกพื้นที่...",
  "Add Zone": "เพิ่มโซน",
  "Add Charge": "เพิ่มค่าบริการ",
  "Charge Name": "ชื่อค่าบริการ",

  // Day End Tab
  "Day End Requirements": "ข้อกำหนดการปิดสิ้นวัน",
  "Configure which entities must be settled or checked before performing a Day End.": "กำหนดรายการที่ต้องชำระหรือตรวจสอบก่อนปิดสิ้นวัน",
  "Category": "หมวดหมู่",
  "Voucher Entry": "รายการใบสำคัญ",
  "Order Type": "ประเภทคำสั่งซื้อ",
  "Void Item": "รายการที่ยกเลิก",
  "Denomination": "การนับธนบัตรและเหรียญ",
  "Product": "สินค้า",
  "Group": "กลุ่ม",

  // Top Nav & Common Statuses
  "Search product by name...": "ค้นหาสินค้าตามชื่อ...",
  "Ticket": "ตั๋ว",
  "Section": "โซน",
  "New": "ใหม่",
  "Active": "ใช้งาน",
  "Toggle Virtual Keyboard": "เปิด/ปิดแป้นพิมพ์เสมือน",
};

/**
 * Translates a given UI string according to active POS language
 */
export const t = (key: string, lang?: PosLanguageMode): string => {
  if (!key) return "";
  const language = lang || getPosLanguage();
  if (language === "Arabic") {
    if (POS_TRANSLATIONS[key]) return POS_TRANSLATIONS[key];
    const trimmed = key.trim();
    if (POS_TRANSLATIONS[trimmed]) return POS_TRANSLATIONS[trimmed];
    const lowerKey = trimmed.toLowerCase();
    for (const [k, v] of Object.entries(POS_TRANSLATIONS)) {
      if (k.toLowerCase() === lowerKey) {
        return v;
      }
    }
    return key;
  }
  if (language === "Thai") {
    if (POS_THAI_TRANSLATIONS[key]) return POS_THAI_TRANSLATIONS[key];
    const trimmed = key.trim();
    if (POS_THAI_TRANSLATIONS[trimmed]) return POS_THAI_TRANSLATIONS[trimmed];
    const lowerKey = trimmed.toLowerCase();
    for (const [k, v] of Object.entries(POS_THAI_TRANSLATIONS)) {
      if (k.toLowerCase() === lowerKey) {
        return v;
      }
    }
    return key;
  }
  return key;
};
