import { getFiles, parseFile, traverseAST } from './utils';

describe('Тест на наличие проверок конфигов и переменных окружения только на входе в приложение', () => {
  // Разрешённые зоны для текущего проекта
  const ALLOWED_ZONES = ['config/', 'scripts/ts/', 'azuro-mapper.ts', 'src/config.ts'];

  const files = getFiles('**/*.{ts,js}', [
    '**/*.test.ts',
    '**/*.d.ts',
    'jest.config.ts',
    'test.setup.ts',
    'tests/**'
  ]);

  files.forEach((file) => {
    test(`Проверка файла ${file}`, () => {
      const { ast } = parseFile(file);
      const isAllowed = ALLOWED_ZONES.some((zone) => file.startsWith(zone) || file.includes(`/${zone}`));

      validateFile(ast, file, isAllowed);
    });
  });
});

// Функция проверки файла
function validateFile(ast: any, file: string, isAllowed: boolean) {
  traverseAST(ast, (node) => {
    validateNode(node, file, isAllowed);
  });
}

// Проверка узла
function validateNode(node: any, file: string, isAllowed: boolean) {
  if (node.type === 'MemberExpression') {
    const memberExpr = node as any;

    // Проверяем process.env.*
    if (
      memberExpr.object?.object?.name === 'process' &&
      memberExpr.object?.property?.name === 'env'
    ) {
      if (!isAllowed) {
        throw new Error(
          `${file}:${node.loc?.start.line} - Недопустимое обращение к переменной окружения (process.env.*) вне конфигурационного слоя.`,
        );
      }
    }

    // Проверяем config.get(...)
    if (
      memberExpr.object?.name === 'config' &&
      memberExpr.property?.name === 'get'
    ) {
      if (!isAllowed) {
        throw new Error(
          `${file}:${node.loc?.start.line} - Недопустимое обращение к конфигурации (config.get(...)) вне конфигурационного слоя.`,
        );
      }
    }
  }
}
