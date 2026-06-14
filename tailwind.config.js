export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1E3A8A',
        'tech-blue': '#3B82F6',
        indigo: '#743EE4',
        steel: '#6B7280',
        success: '#10B981',
        alert: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
