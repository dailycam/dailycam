/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // 파스텔 민트 계열
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5fe9d0',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        safe: {
          // 부드러운 파스텔 그린
          light: '#d1f4e0',
          DEFAULT: '#86d5a8',
          dark: '#5fb888',
        },
        danger: {
          // 부드러운 핑크/레드
          light: '#ffd6d6',
          DEFAULT: '#faa5a5',
          dark: '#f28b8b',
        },
        warning: {
          // 부드러운 옐로우/오렌지
          light: '#fff3cd',
          DEFAULT: '#ffdb8b',
          dark: '#f5c563',
        },
        warm: {
          // 웜 그레이 (보조색)
          50: '#f9f8f6',
          100: '#f4f2ef',
          200: '#e8e6e0',
          300: '#d1cdc4',
        },
        cream: {
          // 크림 베이지 (배경색)
          50: '#fdfcfa',
          100: '#f9f7f4',
          200: '#f5f2ed',
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '6px',    // 기존 8px → 6px
        '2xl': '8px',   // 기존 10px → 8px
        '3xl': '10px',  // 기존 12px → 10px
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 12px 40px rgba(0, 0, 0, 0.06)',
        'glow-mint': '0 0 20px rgba(20, 184, 166, 0.3)',
      },
    },
  },
  plugins: [],
}

