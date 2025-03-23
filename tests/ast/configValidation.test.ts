import { parse } from '@typescript-eslint/parser';
import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('Тест на наличие проверок конфигов и переменных окружения только на входе в приложение', () => {
  // Разрешённые зоны для текущего проекта
  const ALLOWED_ZONES = ['src/config/', 'scripts/node/', 'azuro-mapper.ts'];

  const files = glob.sync('**/*.{ts,js}', {
    ignore: [
      '**/*.test.ts',
      '**/*.d.ts',
      'node_modules/**',
      'coverage/**',
      'jest.config.ts',
      'test.setup.ts',
      'archive/**'
    ]
  });

  files.forEach((file) => {
    test(`Проверка файла ${file}`, () => {
      const content = readFileSync(file, 'utf-8');
      const ast = parse(content, { loc: true, sourceType: 'module' });
      const isAllowed = ALLOWED_ZONES.some((zone) => file.startsWith(zone));
      traverseAST(ast, file, isAllowed);
    });
  });
});

// Функция рекурсивного обхода AST
function traverseAST(node: any, file: string, isAllowed: boolean) {
  validateNode(node, file, isAllowed);
  Object.values(node).forEach((child) => {
    if (Array.isArray(child)) {
      child.forEach((c) => c && typeof c.type === 'string' && traverseAST(c, file, isAllowed));
    } else if (child && typeof child === 'object' && child.type && typeof child.type === 'string') {
      traverseAST(child, file, isAllowed);
    }
  });
}

// Проверка узла
function validateNode(node: any, file: string, isAllowed: boolean) {
  if (node.type === 'MemberExpression') {
    const memberExpr = node;
    // Проверяем process.env.*
    if (memberExpr.object?.object?.name === 'process' && 
        memberExpr.object?.property?.name === 'env') {
      if (!isAllowed) {
        throw new Error(`${file}:${node.loc?.start.line} - Недопустимое обращение к переменной окружения (process.env.*) вне конфигурационного слоя.`);
      }
    }
    
    // Проверяем config.get(...)
    if (memberExpr.object?.name === 'config' && 
        memberExpr.property?.name === 'get') {
      if (!isAllowed) {
        throw new Error(`${file}:${node.loc?.start.line} - Недопустимое обращение к конфигурации (config.get(...)) вне конфигурационного слоя.`);
      }
    }
  }
} 