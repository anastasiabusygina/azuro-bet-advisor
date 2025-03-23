# Универсальный архитектурный тест

Этот тест проверяет структуру проекта на соответствие заданным правилам. Тест не падает при обнаружении несоответствий, а лишь выводит предупреждения в консоль.

## Файлы

- `projectStructure.test.ts` - сам тест, который проверяет структуру проекта
- `projectStructure.config.ts` - конфигурационный файл с описанием разрешенных элементов структуры

## Как использовать в другом проекте

1. Скопируйте оба файла в целевой проект:
   - `projectStructure.test.ts`
   - `projectStructure.config.ts`

2. Отредактируйте `projectStructure.config.ts`, чтобы он соответствовал структуре вашего проекта

3. Запустите тест:
   ```bash
   npm test -- path/to/projectStructure.test.ts
   ```

## Примеры использования

### Базовое использование (импорт напрямую)

```typescript
import { allowedStructure } from './projectStructure.config';
```

### Расширение базовой конфигурации

```typescript
import { extendStructure, allowedStructure } from './projectStructure.config';

const customStructure = extendStructure({
  'src': [...allowedStructure.src, 'newModule'],
  'customDir': ['subdir1', 'subdir2']
});
```

### Добавление элементов в существующую секцию

```typescript
import { addToSection, allowedStructure } from './projectStructure.config';

const updatedStructure = addToSection(allowedStructure, 'src', ['newModule', 'anotherModule']);
```

### Создание полностью новой конфигурации

```typescript
import { type ProjectStructure } from './projectStructure.config';

const myStructure: ProjectStructure = {
  'src': ['components', 'pages', 'utils'],
  'public': ['images', 'fonts'],
  '': ['src', 'public', 'package.json', 'tsconfig.json']
};
```

## Формат структуры

```typescript
{
  'directory': ['allowed_subdirectory1', 'allowed_subdirectory2', ...],
  '': ['allowed_file_or_directory_in_root', ...]
}
```

Специальные ключи:
- `''` (пустая строка): представляет корневую директорию проекта

## Особенности

- Тест не падает, а только выводит предупреждения о несоответствиях
- Конфигурация легко настраивается под любой проект
- Поддерживает расширение и переопределение структуры
- Можно использовать в нескольких проектах с разной структурой 