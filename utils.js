/**
 * Shared utilities — can be extended for multi-language, formatting, etc.
 */
(function (global) {
  "use strict";

  const Utils = {
    /**
     * Format number for display (Arabic-friendly with Western digits)
     */
    formatNumber(n, digits = 0) {
      if (n === "" || n == null || isNaN(n)) return "";
      return Number(n).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    },

    /**
     * Debounce helper
     */
    debounce(fn, wait = 150) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    /**
     * Simple i18n dictionary (extensible)
     */
    strings: {
      ar: {
        choose: "اختر...",
        all: "الكل",
        clearFilters: "إلغاء الفلاتر",
        export: "تصدير",
        print: "طباعة",
        welcome: "مرحباً بك في نظام الصيانة",
        noData: "لا توجد بيانات لهذا الاختيار",
        selectAll: "اختر جميع الفلاتر لعرض البيانات",
      },
      en: {
        choose: "Select...",
        all: "All",
        clearFilters: "Clear filters",
        export: "Export",
        print: "Print",
        welcome: "Welcome to the maintenance system",
        noData: "No data for this selection",
        selectAll: "Select all filters to display data",
      },
    },

    t(key, lang = "ar") {
      return (this.strings[lang] && this.strings[lang][key]) || key;
    },
  };

  global.TMUtils = Utils;
})(window);
