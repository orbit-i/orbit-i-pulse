// lib/i18n.ts
// =============================================================
// LIGHTWEIGHT I18N — foundation layer.
// Covers the navigation, greeting, and common actions now; more
// pages can be wired in incrementally by wrapping strings in t().
// Arabic is RTL — see the ThemeToggle/LanguageSwitcher which also
// flips `dir` on <html>.
// =============================================================
export type Lang = "en" | "ar" | "ur" | "fr" | "es" | "zh" | "hi";

export const LANGUAGES: { code: Lang; label: string; rtl: boolean }[] = [
  { code: "en", label: "English", rtl: false },
  { code: "ar", label: "العربية", rtl: true },
  { code: "ur", label: "اردو", rtl: true },
  { code: "fr", label: "Français", rtl: false },
  { code: "es", label: "Español", rtl: false },
  { code: "zh", label: "中文", rtl: false },
  { code: "hi", label: "हिन्दी", rtl: false },
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

const fr: Dict = {
  overview: "Aperçu", attendance: "Présence", dailyReports: "Rapports quotidiens", tasks: "Tâches",
  leave: "Congé", discussions: "Discussions", documents: "Documents", orgChart: "Organigramme",
  team: "Équipe", departments: "Départements", announcements: "Annonces", analytics: "Analytique",
  myProfile: "Mon profil", settings: "Paramètres", signOut: "Déconnexion",
  goodMorning: "Bonjour", goodAfternoon: "Bon après-midi", goodEvening: "Bonsoir",
  save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", edit: "Modifier", send: "Envoyer", search: "Rechercher",
  checkIn: "Arrivée", checkOut: "Départ", submit: "Soumettre", loading: "Chargement…",
};

const es: Dict = {
  overview: "Resumen", attendance: "Asistencia", dailyReports: "Informes diarios", tasks: "Tareas",
  leave: "Permiso", discussions: "Discusiones", documents: "Documentos", orgChart: "Organigrama",
  team: "Equipo", departments: "Departamentos", announcements: "Anuncios", analytics: "Analítica",
  myProfile: "Mi perfil", settings: "Configuración", signOut: "Cerrar sesión",
  goodMorning: "Buenos días", goodAfternoon: "Buenas tardes", goodEvening: "Buenas noches",
  save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", send: "Enviar", search: "Buscar",
  checkIn: "Entrada", checkOut: "Salida", submit: "Enviar", loading: "Cargando…",
};

const zh: Dict = {
  overview: "概览", attendance: "考勤", dailyReports: "每日报告", tasks: "任务",
  leave: "请假", discussions: "讨论", documents: "文件", orgChart: "组织架构",
  team: "团队", departments: "部门", announcements: "公告", analytics: "分析",
  myProfile: "我的资料", settings: "设置", signOut: "退出登录",
  goodMorning: "早上好", goodAfternoon: "下午好", goodEvening: "晚上好",
  save: "保存", cancel: "取消", delete: "删除", edit: "编辑", send: "发送", search: "搜索",
  checkIn: "签到", checkOut: "签退", submit: "提交", loading: "加载中…",
};

const hi: Dict = {
  overview: "अवलोकन", attendance: "उपस्थिति", dailyReports: "दैनिक रिपोर्ट", tasks: "कार्य",
  leave: "छुट्टी", discussions: "चर्चा", documents: "दस्तावेज़", orgChart: "संगठन चार्ट",
  team: "टीम", departments: "विभाग", announcements: "घोषणाएं", analytics: "विश्लेषण",
  myProfile: "मेरी प्रोफ़ाइल", settings: "सेटिंग्स", signOut: "साइन आउट",
  goodMorning: "सुप्रभात", goodAfternoon: "नमस्कार", goodEvening: "शुभ संध्या",
  save: "सहेजें", cancel: "रद्द करें", delete: "हटाएं", edit: "संपादित करें", send: "भेजें", search: "खोजें",
  checkIn: "चेक इन", checkOut: "चेक आउट", submit: "जमा करें", loading: "लोड हो रहा है…",
};

const DICTS: Record<Lang, Dict> = { en, ar, ur, fr, es, zh, hi };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] || DICTS.en[key] || key;
}

export function isRtl(lang: Lang) {
  return LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
}
