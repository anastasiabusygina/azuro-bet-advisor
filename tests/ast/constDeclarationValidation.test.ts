// tests/ast/constDeclarationValidation.test.ts

import { parse } from '@typescript-eslint/parser';
import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/types';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';
import { constDeclarationConfig } from '../configs/constDeclarationValidation.config';

/**
 * AST-тест для проверки объявлений констант с простыми значениями
 * 
 * Тест ищет объявления 'const' с простыми значениями (строки, числа, boolean, литеральные объекты)
 * во всех файлах проекта. Хардкоженные константы запрещены во всем коде, 
 * включая константы внутри функций.
 * Все значения должны загружаться из YAML-файлов или переменных окружения.
 * 
 * Константы, помеченные комментарием @allow-const-hardcode, игнорируются тестом.
 * Это ЕДИНСТВЕННЫЙ способ разрешить хардкоженную константу.
 */

describe('Тест на хардкоженные константы в коде', () => {
  // Поиск всех TypeScript файлов в директории src
  const files = glob.sync('src/**/*.ts', {
    ignore: constDeclarationConfig.ignorePatterns,
  });

  // Проверка каждого файла
  files.forEach((file) => {
    test(`Проверка хардкоженных констант в файле ${file}`, () => {
      const content = readFileSync(file, 'utf-8');
      // Включаем поддержку комментариев и диапазонов в AST
      const ast = parse(content, { 
        loc: true, 
        sourceType: 'module', 
        comment: true, 
        range: true,
        tokens: true 
      });

      // Список найденных констант с простыми значениями
      const constants: { name: string; line: number; value: string }[] = [];

      // Добавляем логирование для тестового файла
      const isTestFile = file.includes('testHardcoded.ts');
      if (isTestFile) {
        console.log(`Анализ файла: ${file}`);
      }

      // Получаем все комментарии из файла
      const comments = ast.comments || [];
      
      // Словарь разрешенных диапазонов на основе комментариев
      const allowedRanges: { start: number; end: number }[] = [];
      
      // Обрабатываем комментарии и ищем директиву @allow-const-hardcode
      comments.forEach(comment => {
        const commentLine = comment.loc.start.line;
        
        if (isTestFile) {
          console.log(`Комментарий строка ${commentLine}: ${comment.value}`);
        }
        
        if (comment.value.includes('@allow-const-hardcode')) {
          // Добавляем диапазон для проверки (3 строки после комментария)
          allowedRanges.push({
            start: commentLine,
            end: commentLine + 3
          });
          
          if (isTestFile) {
            console.log(`Найден комментарий @allow-const-hardcode в строке ${commentLine}`);
            console.log(`Добавлен разрешенный диапазон: ${commentLine}-${commentLine + 3}`);
          }
        }
      });
      
      // Обход AST для поиска констант
      traverseAST(ast, constants, allowedRanges, isTestFile);

      // Вывод результатов для тестового файла
      if (isTestFile) {
        console.log(`Найдено констант: ${constants.length}`);
        constants.forEach(c => console.log(`  ${c.name}: ${c.value} (строка ${c.line})`));
      }

      // Если есть константы, выбрасываем ошибку
      if (constants.length > 0) {
        const errorMessage = `В файле ${file} найдены хардкоженные константы:\n` +
          constants.map(c => `- ${c.name}: ${c.value} (строка ${c.line})`).join('\n') +
          '\n\nРешения:\n' +
          '1. Вынести значение в конфигурационный файл\n' +
          '2. Использовать переменные окружения\n' +
          '3. Добавить комментарий @allow-const-hardcode перед объявлением константы';
        
        throw new Error(errorMessage);
      }
    });
  });
});

/**
 * Рекурсивный обход AST для поиска констант
 */
function traverseAST(
  node: any, 
  constants: { name: string; line: number; value: string }[],
  allowedRanges: { start: number; end: number }[],
  debug = false
) {
  // Проверяем, является ли текущий узел объявлением константы
  if (node && node.type === AST_NODE_TYPES.VariableDeclaration && node.kind === 'const') {
    processConstDeclaration(node, constants, allowedRanges, debug);
  }
  
  // Проверяем, является ли узел экспортируемым объявлением
  if (node && node.type === AST_NODE_TYPES.ExportNamedDeclaration && 
      node.declaration && node.declaration.type === AST_NODE_TYPES.VariableDeclaration && 
      node.declaration.kind === 'const' && constDeclarationConfig.checkExports) {
    processConstDeclaration(node.declaration, constants, allowedRanges, debug);
  }
  
  // Рекурсивно обходим все дочерние узлы
  if (node && typeof node === 'object') {
    Object.keys(node).forEach(key => {
      const child = node[key];
      
      // Пропускаем свойства, которые не являются узлами AST
      if (key === 'parent' || key === 'loc' || key === 'range' || 
          key === 'comments' || key === 'tokens') {
        return;
      }
      
      if (Array.isArray(child)) {
        // Если свойство содержит массив, обходим каждый элемент массива
        child.forEach(item => {
          if (item && typeof item === 'object') {
            traverseAST(item, constants, allowedRanges, debug);
          }
        });
      } else if (child && typeof child === 'object') {
        // Если свойство содержит объект, рекурсивно обходим его
        traverseAST(child, constants, allowedRanges, debug);
      }
    });
  }
}

/**
 * Обработка объявления константы
 */
function processConstDeclaration(
  node: TSESTree.VariableDeclaration,
  constants: { name: string; line: number; value: string }[],
  allowedRanges: { start: number; end: number }[],
  debug = false
) {
  // Получаем номер строки объявления
  const declarationLine = node.loc?.start.line || 0;
  
  if (debug) {
    console.log(`Обработка const-объявления в строке ${declarationLine}`);
  }
  
  // Проверяем, находится ли объявление в разрешенном диапазоне
  const isAllowed = allowedRanges.some(range => 
    declarationLine >= range.start && declarationLine <= range.end
  );
  
  if (isAllowed) {
    if (debug) {
      console.log(`  Объявление в строке ${declarationLine} разрешено комментарием @allow-const-hardcode`);
    }
    return; // Пропускаем разрешенные объявления
  }

  // Проверяем каждое объявление в декларации
  node.declarations.forEach(declaration => {
    if (debug) {
      console.log(`  Проверка объявления: ${(declaration.id as any).name}`);
    }
    // Проверяем, имеет ли декларация инициализатор
    if (declaration.init) {
      const isHardcoded = isHardcodedValue(declaration.init, debug);
      if (debug) {
        console.log(`    Инициализатор: ${declaration.init.type}`);
        console.log(`    Хардкоженное значение: ${isHardcoded}`);
      }
      // Проверяем, является ли инициализатор хардкоженным значением
      if (isHardcoded && declaration.id.type === AST_NODE_TYPES.Identifier) {
        constants.push({
          name: declaration.id.name,
          line: node.loc?.start.line || 0,
          value: getInitializerValue(declaration.init)
        });
        if (debug) {
          console.log(`    Добавлена константа: ${declaration.id.name}`);
        }
      }
    }
  });
}

/**
 * Проверка, является ли значение хардкоженным
 */
function isHardcodedValue(node: TSESTree.Expression, debug = false): boolean {
  // Если тип узла находится в списке разрешенных, то это не хардкоженное значение
  if (constDeclarationConfig.allowedInitializers.includes(node.type)) {
    return false;
  }
  
  // Проверяем литеральные значения
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return true;
      
    case AST_NODE_TYPES.ObjectExpression:
      // Проверяем, содержит ли объект хардкоженные значения
      return node.properties.some(prop => {
        if (prop.type === AST_NODE_TYPES.Property && prop.value.type !== AST_NODE_TYPES.Identifier) {
          return isHardcodedValue(prop.value as TSESTree.Expression, debug);
        }
        return false;
      });
      
    case AST_NODE_TYPES.ArrayExpression:
      // Проверяем, содержит ли массив хардкоженные значения
      return node.elements.some(elem => {
        if (elem && elem.type !== AST_NODE_TYPES.Identifier) {
          return isHardcodedValue(elem as TSESTree.Expression, debug);
        }
        return false;
      });
      
    case AST_NODE_TYPES.TemplateLiteral:
      // Проверяем шаблонные строки
      return true;
  }
  
  return false;
}

/**
 * Получение строкового представления значения
 */
function getInitializerValue(node: TSESTree.Expression): string {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return String(node.value);
      
    case AST_NODE_TYPES.ObjectExpression:
      return '{...}';
      
    case AST_NODE_TYPES.ArrayExpression:
      return '[...]';
      
    case AST_NODE_TYPES.TemplateLiteral:
      return '`...`';
      
    default:
      return node.type;
  }
} 