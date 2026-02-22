/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ws: {
          primary: '#6366f1',
          'primary-hover': '#4f46e5',
          sidebar: '#ffffff',
          'sidebar-hover': '#f0f4ff',
          'sidebar-active': '#e0e7ff',
          surface: '#ffffff',
          'surface-alt': '#f8fafc',
          'text-sidebar': '#0f172a',
          'text-sidebar-muted': '#64748b',
          online: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.25)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
