module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['module-resolver', {
      root: ['.'],
      alias: {
        '@': './src',
        '@models': './src/models',
        '@utils': './src/utils',
        '@scripts': './src/scripts',
        '@scripts-ts': './scripts/ts',
        '@tests': './tests',
        '@config': './src/config'
      }
    }]
  ]
}; 