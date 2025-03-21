// Конфигурация Babel для тестов
import { TransformOptions } from '@babel/core';

const config: TransformOptions = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};

export default config; 