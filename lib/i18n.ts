// lib/i18n.ts
// =============================================================
// LIGHTWEIGHT I18N — foundation layer.
// Covers the navigation, greeting, and common actions now; more
// pages can be wired in incrementally by wrapping strings in t().
// Arabic is RTL — see the ThemeToggle/LanguageSwitcher which also
// flips `dir` on <html>.
// =============================================================
export type Lang = "en" | "ar" | "ur";

export const LANGUAGES: { code: Lang; label: string; rtl: boolean }[] = [
  { code: "en", label: "English", rtl: false },
  { code: "ar", label: "العربية", rtl: true },
  { code: "ur", label: "اردو", rtl: true },
];

type Dict = Record<string, string>;

const en: Dict = {
  overview: "Overview", attendance: "Attendance", dailyReports: "Daily Reports", tasks: "Tasks",
  leave: "Leave", discussions: "Discussions", documents: "Documents", orgChart: "Org Chart",
  team: "Team", departments: "Departments", announcements: "Announcements", analytics: "Analytics",
  myProfile: "My Profile", settings: "Settings", signOut: "Sign out",
  goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening",
  save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", send: "Send", search: "Search",
  checkIn: "Check In", checkOut: "Check Out", submit: "Submit", loading: "Loading…",
};

const ar: Dict = {
  overview: "نظرة عامة", attendance: "الحضور", dailyReports: "التقارير اليومية", tasks: "المهام",
  leave: "الإجازة", discussions: "المناقشات", documents: "المستندات", orgChart: "الهيكل التنظيمي",
  team: "الفريق", departments: "الأقسام", announcements: "الإعلانات", analytics: "التحليلات",
  myProfile: "ملفي الشخصي", settings: "الإعدادات", signOut: "تسجيل الخروج",
  goodMorning: "صباح الخير", goodAfternoon: "مساء الخير", goodEvening: "مساء الخير",
  save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل", send: "إرسال", search: "بحث",
  checkIn: "تسجيل الحضور", checkOut: "تسجيل الانصراف", submit: "إرسال", loading: "جاري التحميل…",
};

const ur: Dict = {
  overview: "مجموعی جائزہ", attendance: "حاضری", dailyReports: "روزانہ رپورٹس", tasks: "کام",
  leave: "چھٹی", discussions: "بات چیت", documents: "دستاویزات", orgChart: "تنظیمی ڈھانچہ",
  team: "ٹیم", departments: "شعبہ جات", announcements: "اعلانات", analytics: "تجزیات",
  myProfile: "میری پروفائل", settings: "ترتیبات", signOut: "سائن آؤٹ",
  goodMorning: "صبح بخیر", goodAfternoon: "دوپہر بخیر", goodEvening: "شام بخیر",
  save: "محفوظ کریں", cancel: "منسوخ کریں", delete: "حذف کریں", edit: "ترمیم", send: "بھیجیں", search: "تلاش کریں",
  checkIn: "چیک ان", checkOut: "چیک آؤٹ", submit: "جمع کروائیں", loading: "لوڈ ہو رہا ہے…",
};

const DICTS: Record<Lang, Dict> = { en, ar, ur };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] || DICTS.en[key] || key;
}

export function isRtl(lang: Lang) {
  return LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
}
