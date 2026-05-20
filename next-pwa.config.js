/** @type {import('next-pwa').PwaConfig} */
module.exports = {
  dest: 'public',
  register: true,
  scope: '/',
  sw: 'service-worker.js',
  disable: process.env.NODE_ENV === 'development',
};
