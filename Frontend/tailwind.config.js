/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  corePlugins: {
    preflight: false, // Disable to avoid conflicts with Bootstrap
  },
  theme: {
    extend: {
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'zoom-in-95': { from: { transform: 'scale(0.95)' }, to: { transform: 'scale(1)' } },
      },
      animation: {
        'in': 'fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
