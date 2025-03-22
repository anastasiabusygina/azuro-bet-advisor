// Общие утилиты для тестов
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { parse } from '@typescript-eslint/parser';
import { TSESTree } from '@typescript-eslint/typescript-estree';

// Типы для AST анализа
export type AnyNode = TSESTree.Node;

// Функция для получения файлов по маске
export function getFiles(pattern: string, ignore: string[] = []): string[] {
  return glob.sync(pattern, { 
    ignore: [
      ...ignore,
      'node_modules/**',
      'coverage/**',
      'dist/**'
    ] 
  });
}

// Функция для чтения и парсинга файла
export function parseFile(filePath: string): { content: string, ast: any } {
  const content = readFileSync(filePath, 'utf-8');
  const ast = parse(content, { 
    loc: true, 
    sourceType: 'module' 
  }) as any;
  
  return { content, ast };
}

// Функция рекурсивного обхода AST
export function traverseAST(node: any, callback: (node: any) => void) {
  // Вызываем колбэк для текущего узла
  callback(node);

  // Обходим все дочерние узлы
  for (const key in node) {
    const child = node[key];
    
    if (Array.isArray(child)) {
      child.forEach(item => {
        if (item && typeof item === 'object' && item.type && typeof item.type === 'string') {
          traverseAST(item, callback);
        }
      });
    } else if (child && typeof child === 'object' && child.type && typeof child.type === 'string') {
      traverseAST(child, callback);
    }
  }
} 