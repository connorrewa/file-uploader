module.exports = {
    content: ['./views/**/*.ejs', './public/**/*.js'],
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
            },
            fontFamily: {
                body: ['ui-sans-serif', 'system-ui'], // Define the font-body class
                sans: ['ui-sans-serif', 'system-ui'],
                serif: ['ui-serif', 'Georgia'],
                mono: ['ui-monospace', 'SFMono-Regular'],
            },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
};
