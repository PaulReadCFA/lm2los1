// postcss.config.cjs
// CommonJS syntax for a .cjs file
const tailwind = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: [tailwind, autoprefixer],
};

