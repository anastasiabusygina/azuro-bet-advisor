# Инвентаризация кода проекта Azuro Betting Tools

## Скрипты TypeScript

### Дубликаты скриптов

В проекте обнаружены следующие дубликаты скриптов TypeScript:

| Файлы | Назначение | Основная версия |
|-------|------------|-----------------|
| `/scripts/ts/fetchAndFormatMatches.standalone.ts` и `/src/scripts/fetchAndFormatMatches.standalone.ts` | Скрипт для получения и форматирования матчей | `/src/scripts/fetchAndFormatMatches.standalone.ts` |
| `/scripts/ts/matchButtonMapper.ts` и `/src/scripts/matchButtonMapper.ts` | Модуль для сопоставления ID игры, условия и исхода с кнопками | `/src/scripts/matchButtonMapper.ts` |
| `/scripts/ts/azuroDictionaries.ts` и `/src/scripts/azuroDictionaries.ts` | Модуль со словарями для преобразования ID из API Azuro | `/src/scripts/azuroDictionaries.ts` |
| `/scripts/ts/demo.ts` и `/src/scripts/demo.ts` | Демонстрационный скрипт для проверки работы модуля сопоставления рекомендаций | `/src/scripts/demo.ts` |

### Скрипты TypeScript

| Файл | Назначение | Зависимости |
|------|------------|-------------|
| `/src/scripts/fetchAndFormatMatches.standalone.ts` | Скрипт для получения и форматирования матчей | `@azuro-org/dictionaries`, `node-fetch`, `dotenv`, `fs/promises` |
| `/src/scripts/matchButtonMapper.ts` | Модуль для сопоставления ID игры, условия и исхода с кнопками | `node-fetch`, `azuroDictionaries.ts` |
| `/src/scripts/azuroDictionaries.ts` | Модуль со словарями для преобразования ID из API Azuro | - |
| `/src/scripts/demo.ts` | Демонстрационный скрипт для проверки работы модуля сопоставления рекомендаций | `matchButtonMapper.ts` |
| `/src/scripts/matchButtonMapperMock.ts` | Мокированные данные для тестирования matchButtonMapper | - |
| `/src/scripts/babel.config.ts` | Конфигурация Babel для тестов | - |

### Скрипты Bash

| Файл | Назначение | Должен быть преобразован в |
|------|------------|---------------------------|
| `/scripts/bash/get_match_buttons.sh` | Скрипт для получения кнопок матча | `/src/scripts/getMatchButtons.ts` |
| `/scripts/bash/show_upcoming_matches.sh` | Скрипт для отображения предстоящих матчей | `/src/scripts/showUpcomingMatches.ts` |

## Тесты

### Дубликаты тестов

В проекте обнаружены следующие дубликаты тестов:

| Файлы | Назначение | Основная версия |
|-------|------------|-----------------|
| `/scripts/ts/__tests__/matchButtonMapper.test.ts` и `/src/scripts/__tests__/matchButtonMapper.test.ts` | Тесты для модуля matchButtonMapper | `/src/scripts/__tests__/matchButtonMapper.test.ts` |
| `/scripts/ts/__tests__/no_hardcoding.test.ts` и `/src/scripts/__tests__/no_hardcoding.test.ts` | Тесты на отсутствие хардкода | `/src/scripts/__tests__/no_hardcoding.test.ts` |
| `/scripts/ts/__tests__/show_upcoming_matches.test.ts` и `/src/scripts/__tests__/show_upcoming_matches.test.ts` | Тесты для скрипта show_upcoming_matches | `/src/scripts/__tests__/show_upcoming_matches.test.ts` |
| `/scripts/ts/__tests__/show_upcoming_messages.test.ts` и `/src/scripts/__tests__/show_upcoming_messages.test.ts` | Тесты для проверки объявлений констант | `/src/scripts/__tests__/show_upcoming_messages.test.ts` |

### Тесты для скриптов

| Файл | Назначение | Тестируемый файл |
|------|------------|------------------|
| `/src/scripts/__tests__/matchButtonMapper.test.ts` | Тесты для модуля matchButtonMapper | `/src/scripts/matchButtonMapper.ts` |
| `/src/scripts/__tests__/no_hardcoding.test.ts` | Тесты на отсутствие хардкода в скриптах | `/scripts/bash/get_match_buttons.sh` |
| `/src/scripts/__tests__/show_upcoming_matches.test.ts` | Тесты для скрипта show_upcoming_matches | `/scripts/bash/show_upcoming_matches.sh` |
| `/src/scripts/__tests__/show_upcoming_messages.test.ts` | Тесты для проверки объявлений констант | `/scripts/bash/show_upcoming_matches.sh` |

### Общие тесты

| Файл | Назначение |
|------|------------|
| `/tests/configValidation.test.ts` | Тесты для валидации конфигурации |
| `/tests/configPresenceValidation.test.ts` | Тесты для проверки наличия необходимых конфигурационных параметров |
| `/tests/strictTryCatchValidation.test.ts` | Тесты для проверки корректности обработки исключений |
| `/tests/utils.ts` | Утилиты для тестирования |

## Структура проекта после реорганизации

После реорганизации проект должен иметь следующую структуру:

```
/
├── src/
│   ├── scripts/
│   │   ├── __tests__/
│   │   │   ├── getMatchButtons.test.ts
│   │   │   ├── matchButtonMapper.test.ts
│   │   │   ├── showUpcomingMatches.test.ts
│   │   │   └── ...
│   │   ├── azuroDictionaries.ts
│   │   ├── fetchAndFormatMatches.standalone.ts
│   │   ├── getMatchButtons.ts
│   │   ├── matchButtonMapper.ts
│   │   ├── matchButtonMapperMock.ts
│   │   ├── showUpcomingMatches.ts
│   │   └── index.ts
│   └── ...
├── tests/
│   ├── configValidation.test.ts
│   ├── configPresenceValidation.test.ts
│   ├── strictTryCatchValidation.test.ts
│   ├── utils.ts
│   └── README.md
└── ...
```

## Зависимости между скриптами

```
fetchAndFormatMatches.standalone.ts
 ├── @azuro-org/dictionaries
 ├── node-fetch
 ├── dotenv
 └── fs/promises

matchButtonMapper.ts
 ├── node-fetch
 └── azuroDictionaries.ts

demo.ts
 └── matchButtonMapper.ts

getMatchButtons.ts (новый)
 ├── node-fetch
 ├── azuroDictionaries.ts
 └── fs/promises

showUpcomingMatches.ts (новый)
 ├── node-fetch
 ├── fs/promises
 └── dotenv
```

## Рекомендации по реорганизации

1. **Перенести все скрипты в `/src/scripts/`**:
   - Все TypeScript скрипты должны находиться в директории `/src/scripts/`
   - Дубликаты должны быть удалены

2. **Преобразовать Bash-скрипты в TypeScript**:
   - `/scripts/bash/get_match_buttons.sh` → `/src/scripts/getMatchButtons.ts`
   - `/scripts/bash/show_upcoming_matches.sh` → `/src/scripts/showUpcomingMatches.ts`

3. **Обновить тесты**:
   - Переместить все тесты для скриптов в `/src/scripts/__tests__/`
   - Обновить импорты в тестах для указания на новые пути к скриптам
   - Добавить тесты для новых TypeScript скриптов

4. **Обновить конфигурацию сборки**:
   - Обновить `tsconfig.json` для корректной сборки проекта
   - Обновить скрипты в `package.json` для запуска TypeScript версий скриптов

5. **Удалить ненужные файлы**:
   - Удалить директорию `/scripts/` после перемещения всех необходимых файлов 