/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--text-main)",
                surface: "var(--surface)",
                "surface-highlight": "var(--surface-highlight)",
                "surface-border": "var(--surface-border)",
                "text-main": "var(--text-main)",
                "text-muted": "var(--text-muted)",
                primary: {
                    DEFAULT: "var(--primary)",
                    dark: "var(--primary-dark)",
                    light: "var(--primary-light)",
                    foreground: "var(--primary-foreground)",
                },
            },
        },
    },
    plugins: [],
};
