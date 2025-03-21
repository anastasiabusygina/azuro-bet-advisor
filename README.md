# Azuro API Client Tools

Набор инструментов для работы с API Azuro Protocol, который позволяет получать информацию о матчах, доступных ставках и их представлении в виде, соответствующем пользовательскому интерфейсу.

## Назначение проекта

Проект предназначен для получения данных о предстоящих спортивных матчах, доступных для ставок через Azuro Protocol. Основная задача - предоставить пользователю информацию о матчах с удобным форматированием, чтобы:

1. Просматривать предстоящие спортивные события (футбол, баскетбол и др.) на определенный временной период
2. Видеть время начала матчей как в UTC, так и в московском времени (МСК)
3. Передавать данные о матчах для анализа и получения рекомендаций по ставкам
4. Сопоставлять рекомендации с конкретными кнопками в интерфейсе Azuro для осуществления ставок

Типичный сценарий использования:
- Получение списка предстоящих матчей на ближайшие сутки
- Анализ данных (внешний компонент)
- Получение рекомендаций с указанием ID матча, условия и исхода
- Определение конкретной кнопки в интерфейсе Azuro для совершения ставки

## Структура проекта

```
├── azuro/                 # Базовые компоненты для работы с Azuro API
│   ├── client.ts          # Конфигурация GraphQL клиента
│   ├── types.ts           # Типы данных для Azuro API
│   └── queries/           # GraphQL запросы
│       ├── getBetsQuery.ts    # Запрос для получения информации о ставках
│       ├── getMatchesQuery.ts # Запрос для получения списка матчей
│       └── getSportsQuery.ts  # Запрос для получения списка видов спорта
├── config/                # Конфигурационные файлы
│   ├── output/            # Директория для выходных файлов
│   ├── settings/          # Директория для пользовательских настроек
│   ├── temp/              # Директория для временных файлов
│   └── match_data/        # Локальные данные о матчах (если используются)
├── data/                  # Данные и примеры
│   └── examples/          # Примеры данных
│       ├── match.md       # Пример данных о матче
│       └── match_buttons.txt # Пример вывода кнопок ставок
├── docs/                  # Документация
│   └── task.md            # Описание задачи
├── scripts/               # Скрипты для работы с API
│   ├── bash/              # Bash скрипты
│   │   ├── get_match_buttons.sh    # Скрипт для получения кнопок матча
│   │   └── show_upcoming_matches.sh # Скрипт для отображения предстоящих матчей
│   ├── ts/                # TypeScript скрипты
│   │   └── fetchAndFormatMatches.standalone.ts # Основной TS скрипт для получения матчей
│   ├── data/              # Данные, сохраненные скриптами
│   │   └── matches/       # Сохраненные данные о матчах
│   └── utils/             # Вспомогательные скрипты
│       └── fetch-matches-standalone.sh # Скрипт для запуска обновления матчей
├── temp_storage/          # Временное хранилище для неиспользуемых файлов
├── .env                   # Переменные окружения
├── azuro-mapper.js        # JS-обертка для библиотеки @azuro-org/dictionaries
├── get_match_buttons.sh   # Символическая ссылка на scripts/bash/get_match_buttons.sh
├── show_upcoming_matches.sh # Символическая ссылка на scripts/bash/show_upcoming_matches.sh
├── package.json           # Зависимости проекта
└── tsconfig.json          # Конфигурация TypeScript
```

## Основные компоненты

### 1. TypeScript скрипт (современный метод)

Основной TypeScript скрипт для получения информации о матчах из Azuro API:

```bash
# Получить матчи с настройками по умолчанию
npm run fetch

# Получить только футбольные матчи
npm run fetch:football 

# Получить только баскетбольные матчи
npm run fetch:basketball
```

Результаты сохраняются в `scripts/data/matches/` в формате Markdown.

#### Особенности форматирования времени

Для удобного планирования ставок, время начала матчей отображается в двух форматах:
- UTC (всемирное координированное время)
- МСК (московское время, UTC+3)

Это позволяет быстро ориентироваться в расписании предстоящих матчей без необходимости конвертации временных зон.

### 2. Bash скрипты (альтернативный метод)

#### Получение информации о конкретном матче

Скрипт `get_match_buttons.sh` для получения информации о матчах и доступных ставках с форматированием, соответствующим UI:

```bash
# Получить информацию о конкретном матче
./get_match_buttons.sh GAME_ID

# Получить информацию о рекомендуемой ставке (стандартный синтаксис)
./get_match_buttons.sh -g GAME_ID -c CONDITION_ID -o OUTCOME_ID

# Получить информацию о рекомендуемой ставке (упрощенный синтаксис)
./get_match_buttons.sh GAME_ID CONDITION_ID OUTCOME_ID

# Получить подробную информацию о рекомендуемой ставке
./get_match_buttons.sh -g GAME_ID -c CONDITION_ID -o OUTCOME_ID -v
```

**Новая возможность:** Теперь можно использовать упрощенный синтаксис с тремя позиционными аргументами для быстрого получения информации о рекомендуемой ставке. Этот способ предоставляет максимально лаконичный вывод.

Опции скрипта:
- `-h, --help` — Показать справку
- `-g, --game ID` — ID игры
- `-c, --condition ID` — ID условия ставки (conditionId)
- `-o, --outcome ID` — ID исхода ставки (outcomeId)
- `-v, --verbose` — Подробный режим (с дополнительной информацией)
- `-l, --local-only` — Использовать только локальные данные
- `-a, --api-only` — Использовать только API (игнорировать локальные данные)
- `-u, --auto-update` — Автоматически обновлять данные
- `-q, --quiet` — Тихий режим (без интерактивных запросов)
- `-j, --json` — Вывод в формате JSON
- `-f, --filter TYPE` — Фильтровать по типу ставки (например: '1X2', 'Total')
- `-r, --recommended` — Выделить рекомендованную ставку

Результаты выводятся в консоль и сохраняются в файлы:
- `config/output/match_buttons.txt` (текстовый формат)
- `config/output/match_buttons.json` (JSON формат)

#### Отображение предстоящих матчей

Скрипт `show_upcoming_matches.sh` для отображения списка предстоящих матчей и доступных ставок:

```bash
# Показать матчи на ближайший час
./show_upcoming_matches.sh

# Показать футбольные матчи на ближайший час
./show_upcoming_matches.sh --sport Football

# Показать матчи на ближайшие 3 часа
./show_upcoming_matches.sh --time 3

# Показать матчи с отображением типов ставок
./show_upcoming_matches.sh --outcome-type

# Вывести результат в формате JSON
./show_upcoming_matches.sh --json
```

Опции скрипта:
- `-h, --help` — Показать справку
- `-s, --sport SPORT` — Фильтровать по виду спорта (например: 'Football', 'Basketball')
- `-t, --time HOURS` — Период времени в часах (по умолчанию: 1 час)
- `-o, --outcome-type` — Показывать наиболее популярные типы исходов
- `-j, --json` — Вывод в формате JSON
- `--no-redirect` — Выводить результат в консоль, а не только в файл
- `--debug` — Сохранять отладочные сообщения в файл

Результаты сохраняются в файлы:
- `config/output/upcoming_matches.txt` (текстовый формат)
- `config/output/upcoming_matches.json` (JSON формат)

## Как узнать какую кнопку нажать в интерфейсе Azuro

Когда вы получаете рекомендацию ставки, она содержит три ключевых параметра:

```json
{
  "gameId": "1006000000000026766328", 
  "conditionId": "100610060000000000267663280000000000000717820945",
  "outcomeId": "181"
}
```

### Быстрая инструкция в 3 шага:

#### 1️⃣ Скопируйте данные из рекомендации

Возьмите из рекомендации три значения:
- `gameId` (ID матча)
- `conditionId` (ID типа ставки)
- `outcomeId` (ID исхода)

#### 2️⃣ Запустите скрипт (НОВЫЙ упрощенный синтаксис)

```bash
./get_match_buttons.sh 1006000000000026766328 100610060000000000267663280000000000000717820945 181
```

ИЛИ используйте стандартный синтаксис:

```bash
./get_match_buttons.sh -g 1006000000000026766328 -c 100610060000000000267663280000000000000717820945 -o 181
```

#### 3️⃣ Получите название кнопки, которую нужно нажать

Скрипт выдаст результат в формате:

```
Handicap: Greenock Morton (-1)
```

Это означает, что нужно найти в интерфейсе Azuro раздел "Handicap" и нажать кнопку "Greenock Morton (-1)".

### Дополнительные возможности:

1. Для получения подробной информации используйте флаг `-v`:
   ```bash
   ./get_match_buttons.sh -v -g 1006000000000026766328 -c 100610060000000000267663280000000000000717820945 -o 181
   ```
   
   Результат будет содержать больше информации:
   ```
   Handicap: Greenock Morton (-1)
   ----------------------------------------------
   ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
   ТИП СТАВКИ: Handicap
   ПАРАМЕТР: -1
   ИСХОД: Team 1
   КОЭФФИЦИЕНТ: 1.39636342006
   ```

2. Если требуется вывод в формате JSON, используйте флаг `-j`:
   ```bash
   ./get_match_buttons.sh -j -g 1006000000000026766328 -c 100610060000000000267663280000000000000717820945 -o 181
   ```

### Важно:
- Обращайте внимание на название раздела (например, "Handicap", "Total Goals", "Full Time Result") - именно в этом разделе нужно искать кнопку.
- Параметр в скобках (например, "(-1)") является важной частью ставки и должен точно соответствовать тому, что вы видите в интерфейсе.

## Интеграция с библиотекой Azuro

Проект использует официальную библиотеку `@azuro-org/dictionaries` через JS-обертку (`azuro-mapper.js`) для получения точных названий рынков и исходов ставок. Это обеспечивает корректное отображение информации о ставках в соответствии с тем, как они представлены в официальном интерфейсе Azuro.

Функции, доступные через JavaScript API:
- `get_market_name` - получение названия рынка (типа ставки) по ID исхода
- `get_selection_name` - получение названия исхода ставки по ID исхода

## Настройка и зависимости

### Конфигурация

Настройки проекта осуществляются через файл `.env`:

```
CHAIN=polygon-mainnet
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
MAINNET_GRAPH_URL=https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3
```

### Требования

- Node.js 18+
- npm
- bash (для скриптов *.sh)
- jq (для обработки JSON в bash скриптах) 