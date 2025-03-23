// tests/ast/envConfigSeparation.test.ts

import { parse } from '@typescript-eslint/parser';
import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/types';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { envConfigSeparation } from '../configs/envConfigSeparation.config';

describe('Тест на строгое разделение env и config', () => {
  const files = glob.sync('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.d.ts', 'node_modules/**', 'archive/**'],
  });

  files.forEach((file) => {
    test(`Проверка файла ${file}`, () => {
      const content = readFileSync(file, 'utf-8');
      const ast = parse(content, { loc: true, sourceType: 'module' });

      const isAllowedEnvFile = envConfigSeparation.allowedEnvFiles.some((allowed) =>
        file.endsWith(allowed)
      );

      traverseAST(ast, file, isAllowedEnvFile);
    });
  });
});

// Рекурсивный обход AST
function traverseAST(node: TSESTree.Node, file: string, isAllowedEnvFile: boolean) {
  validateNode(node, file, isAllowedEnvFile);

  Object.values(node).forEach((child) => {
    if (Array.isArray(child)) {
      child.forEach(
        (c) => c && typeof c.type === 'string' && traverseAST(c as TSESTree.Node, file, isAllowedEnvFile)
      );
    } else if (child && typeof child === 'object' && child.type && typeof child.type === 'string') {
      traverseAST(child as TSESTree.Node, file, isAllowedEnvFile);
    }
  });
}

// Проверка каждого узла AST
function validateNode(node: TSESTree.Node, file: string, isAllowedEnvFile: boolean) {
  // Проверка на прямое обращение к process.env вне разрешённых файлов
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object?.type === AST_NODE_TYPES.MemberExpression &&
    node.object.object?.type === AST_NODE_TYPES.Identifier &&
    node.object.object.name === 'process' &&
    node.object.property?.type === AST_NODE_TYPES.Identifier &&
    node.object.property.name === 'env' &&
    !isAllowedEnvFile
  ) {
    throw new Error(
      `${file}:${node.loc?.start.line} - Недопустимое обращение к process.env вне разрешённого файла.`
    );
  }

  // Запрещаем .default() при валидации переменных окружения
  if (
    envConfigSeparation.disallowDefaults &&
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee?.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property?.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'default' &&
    isAllowedEnvFile
  ) {
    throw new Error(
      `${file}:${node.loc?.start.line} - Запрещено использование .default() при определении переменных окружения.`
    );
  }

  // Запрещаем fallback-значения (process.env.VAR || 'значение')
  if (
    envConfigSeparation.disallowFallbacks &&
    node.type === AST_NODE_TYPES.LogicalExpression &&
    node.operator === '||' &&
    ((node.left.type === AST_NODE_TYPES.MemberExpression &&
      node.left.object?.type === AST_NODE_TYPES.MemberExpression &&
      node.left.object.object?.type === AST_NODE_TYPES.Identifier &&
      node.left.object.object.name === 'process' &&
      node.left.object.property?.type === AST_NODE_TYPES.Identifier &&
      node.left.object.property.name === 'env') ||
      (node.left.type === AST_NODE_TYPES.Identifier && node.left.name === 'env'))
  ) {
    throw new Error(
      `${file}:${node.loc?.start.line} - Запрещено использовать fallback-значения для переменных окружения (process.env.X || 'значение').`
    );
  }
}
