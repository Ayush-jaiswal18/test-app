/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#123456', // main brand
          secondary: '#ff6600', // accent orange
          accent: '#ffaa00', // gold accent
          soft: '#f9f9f9', // soft background
          dark: '#222222', // dark text
        },
        text: {
          primary: '#222222',
          secondary: '#555555',
        },
        bg: {
          main: '#ffffff',
          alt: '#f9f9f9',
        },
        border: '#e0e0e0',
      },
      boxShadow: {
        brand: '0 20px 40px rgba(18, 52, 86, 0.12)',
        card: '0 12px 30px rgba(0, 0, 0, 0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #123456, #ff6600, #ffaa00)',
      },
    },
  },
  plugins: [],
};
