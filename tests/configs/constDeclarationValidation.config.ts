/**
 * Конфигурация для теста объявлений констант
 * 
 * Определяет параметры проверки объявлений констант.
 * Хардкоженные константы запрещены во всем коде, кроме специально исключенных файлов.
 * Явно исключены из проверки файлы конфигурации: config.yaml и .env.
 * Все значения должны загружаться из YAML-файлов или переменных окружения.
 */

export const constDeclarationConfig = {
  // Игнорируемые паттерны. Никогда не включать сюда config.ts и validateEnv.ts!
  ignorePatterns: [
    '**/*.test.ts', 
    '**/*.d.ts', 
    'node_modules/**', 
    'archive/**',
    'tests/**',
    '**/.env'
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
    // LogicalExpression намеренно удален из списка, чтобы проверять хардкод в выражениях x || 'default'
    // При необходимости пользователь может добавить его в список: 'LogicalExpression',
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