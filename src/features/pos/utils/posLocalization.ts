export type PosLanguageMode = "English" | "Arabic";
export type ProductViewMode = "English" | "Arabic" | "English and Arabic";

export const getPosLanguage = (): PosLanguageMode => {
  const direct = localStorage.getItem("posLanguage");
  if (direct && ["English", "Arabic"].includes(direct)) {
    return direct as PosLanguageMode;
  }
  try {
    const raw = localStorage.getItem("posConfigs");
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = parsed?.configs?.posLanguage || parsed?.posLanguage;
      if (val && ["English", "Arabic"].includes(val)) {
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
  return key;
};
