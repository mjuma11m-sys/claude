// إداراتي — Tailwind v3 preset. الاستخدام في tailwind.config.js:
//   presets: [require("./src/theme/tailwind.preset.js")]
// (Tailwind v4: انسخ القيم إلى @theme في index.css — كلها var(--…) من tokens.css)
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        night: "var(--night)",
        brand: { DEFAULT: "var(--brand)", on: "var(--on-brand)" },
        gold: { DEFAULT: "var(--gold)", on: "var(--on-gold)" },
        bg: "var(--bg)",
        surface: { DEFAULT: "var(--surface)", 2: "var(--surface-2)" },
        line: "var(--line)",
        ink: "var(--text)",
        muted: "var(--muted)",
        paid: { DEFAULT: "var(--paid)", soft: "var(--paid-soft)" },
        due: { DEFAULT: "var(--due)", soft: "var(--due-soft)" },
        late: { DEFAULT: "var(--late)", soft: "var(--late-soft)" },
      },
      fontFamily: { sans: ["var(--font)"] },
      borderRadius: { sm: "var(--radius-sm)", DEFAULT: "var(--radius)", lg: "var(--radius-lg)" },
      boxShadow: { card: "var(--shadow)" },
      transitionTimingFunction: { out: "var(--ease-out)", drawer: "var(--ease-drawer)" },
      screens: { tablet: "768px", desktop: "1200px" },
    },
  },
};
