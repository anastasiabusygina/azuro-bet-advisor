import { parse } from '@typescript-eslint/parser';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { TSESTree } from '@typescript-eslint/types';
import { ignorePatterns, validLoggerPatterns } from '../configs/strictTryCatchValidation.config';

describe('Строгий тест на корректность try-catch в проекте', () => {
  const files = glob.sync('**/*.{ts,js}', {
    ignore: ignorePatterns
  });

  files.forEach((file) => {
    test(`Проверка файла ${file}`, () => {
      // Дополнительная проверка, чтобы убедиться, что файл не является тестовым или скомпилированным
      if (file.includes('dist/') || file.includes('tests/') || file.includes('.test.')) {
        return; // Пропускаем тестовые и скомпилированные файлы
      }
      const content = readFileSync(file, 'utf-8');
      try {
        const ast = parse(content, { loc: true, sourceType: 'module' });
        traverseAST(ast, file);
      } catch (err) {
        // Выбрасываем ошибку для фейла теста
        throw new Error((err as Error).message);
      }
    });
  });
});

// Рекурсивный обход AST
function traverseAST(node: TSESTree.Node, file: string, ancestors: TSESTree.Node[] = []) {
  validateNode(node, file, ancestors);
  Object.values(node).forEach((child: any) => {
    if (Array.isArray(child)) {
      child.forEach((c: any) => c && typeof c.type === 'string' && traverseAST(c as TSESTree.Node, file, [...ancestors, node]));
    } else if (child && typeof child === 'object' && child.type && typeof child.type === 'string') {
      traverseAST(child as TSESTree.Node, file, [...ancestors, node]);
    }
  });
}

// Валидация узлов AST
function validateNode(node: TSESTree.Node, file: string, ancestors: TSESTree.Node[]) {
  switch (node.type) {
    case 'AwaitExpression':
      if (!ancestors.some((ancestor) => ancestor.type === 'TryStatement')) {
        throw new Error(`${file}:${node.loc?.start.line} - Асинхронный вызов (await) без try-catch.`);
      }
      break;
    case 'ThrowStatement':
      if (!ancestors.some((ancestor) => ancestor.type === 'TryStatement')) {
        throw new Error(`${file}:${node.loc?.start.line} - Явный throw без try-catch.`);
      }
      break;
    case 'TryStatement':
      validateTryStatement(node as TSESTree.TryStatement, file);
      break;
  }
}

// Проверка корректности try-catch блока
function validateTryStatement(node: TSESTree.TryStatement, file: string) {
  const catchClause = node.handler;
  if (!catchClause) {
    throw new Error(`${file}:${node.loc?.start.line} - Try без catch недопустим.`);
  }
  
  if (catchClause.body.body.length === 0) {
    throw new Error(`${file}:${catchClause.loc?.start.line} - Пустой catch-блок недопустим.`);
  }
  
  const statements = catchClause.body.body;
  
  // Проверка, что catch не просто перебрасывает ошибку
  const [firstStmt] = statements;
  if (
    statements.length === 1 &&
    firstStmt.type === 'ThrowStatement' &&
    firstStmt.argument.type === 'Identifier' &&
    (catchClause.param?.type === 'Identifier' && firstStmt.argument.name === catchClause.param.name)
  ) {
    throw new Error(`${file}:${firstStmt.loc?.start.line} - Недопустимо просто перебрасывать ошибку дальше без обработки.`);
  }
  
  // Расширенная проверка, что catch содержит обработку или логирование
  const hasHandlingOrLogging = statements.some(
    (stmt: TSESTree.Statement) =>
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'CallExpression' &&
      (
        // Стандартные методы логирования (console.log, console.error и т.д.)
        (stmt.expression.callee.type === 'MemberExpression' &&
          stmt.expression.callee.property.type === 'Identifier' &&
          validLoggerPatterns.standardMethods.includes(stmt.expression.callee.property.name)) ||
        // Прямые вызовы функций логирования (captureException, logError и т.д.)
        (stmt.expression.callee.type === 'Identifier' &&
          validLoggerPatterns.directFunctions.includes(stmt.expression.callee.name)) ||
        // Методы кастомных логгеров (logger.error, Logger.warn и т.д.)
        (stmt.expression.callee.type === 'MemberExpression' &&
          stmt.expression.callee.object.type === 'Identifier' &&
          validLoggerPatterns.customLoggers.includes(stmt.expression.callee.object.name))
      )
  );
  
  if (!hasHandlingOrLogging) {
    throw new Error(`${file}:${catchClause.loc?.start.line} - В catch-блоке отсутствует логирование или обработка ошибки.`);
  }
  
  // Дополнительная проверка: после логирования не должно быть повторного выбрасывания ошибки
  // Ищем индекс выражения с логированием
  const loggingIndex = statements.findIndex(
    (stmt: TSESTree.Statement) =>
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'CallExpression'
  );
  
  // Проверяем, есть ли после логирования оператор throw
  if (loggingIndex !== -1 && loggingIndex < statements.length - 1) {
    const hasThrowAfterLogging = statements.slice(loggingIndex + 1).some(
      (stmt: TSESTree.Statement) => stmt.type === 'ThrowStatement'
    );
    
    if (hasThrowAfterLogging) {
      throw new Error(`${file}:${catchClause.loc?.start.line} - После логирования в catch-блоке недопустимо выбрасывать новую ошибку. Используйте обработку ошибки вместо повторного выбрасывания.`);
    }
  }
} 