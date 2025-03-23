/**
 * Конфигурация для теста объявлений констант
 * 
 * Определяет параметры проверки объявлений констант.
 * Хардкоженные константы запрещены во всем коде, включая конфигурационные файлы.
 * Все значения должны загружаться из YAML-файлов или переменных окружения.
 */

export const constDeclarationConfig = {
  // Игнорируемые паттерны
  ignorePatterns: [
    '**/*.test.ts', 
    '**/*.d.ts', 
    'node_modules/**', 
    'archive/**',
    'tests/**'
  ],
  
  // Разрешенные паттерны для инициализаторов констант
  allowedInitializers: [
    // Разрешаем импорты
    'ImportDeclaration',
    // Разрешаем вызовы функций (для загрузки YAML)
    'CallExpression',
    // Разрешаем обращения к process.env
    'MemberExpression',
    // Разрешаем выражения
    'BinaryExpression',
    'LogicalExpression',
    'ConditionalExpression',
    'UnaryExpression',
    // Разрешаем ссылки на другие переменные
    'Identifier',
    // Разрешаем присваивание типов
    'TSAsExpression'
  ],
  
  // Проверять все объявления const, включая внутри функций
  checkTopLevelOnly: false,
  
  // Проверять объявления в export
  checkExports: true
}; 