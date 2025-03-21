#!/bin/bash

###############################
# AZURO UPCOMING MATCHES VIEWER
###############################
# Скрипт для отображения предстоящих матчей и доступных ставок
# из API Azuro Protocol.
#
# Использование:
#   ./show_upcoming_matches.sh [опции]
#
# Сохраняет результаты в:
#   - config/output/upcoming_matches.txt (текстовый формат)
#   - config/output/upcoming_matches.json (JSON формат)
###############################

###############################
# КОНФИГУРАЦИЯ
###############################

# Директории для хранения данных
CONFIG_DIR="config"                         # Основная директория конфигурации
CONFIG_SETTINGS_DIR="$CONFIG_DIR/settings"  # Директория с настройками
OUTPUT_DIR="$CONFIG_DIR/output"             # Директория для выходных файлов
TEMP_DIR="$CONFIG_DIR/temp"                 # Директория для временных файлов

# Имена файлов для вывода
UPCOMING_MATCHES_TEXT_FILE="upcoming_matches.txt"  # Имя файла для текстового вывода
UPCOMING_MATCHES_JSON_FILE="upcoming_matches.json" # Имя файла для JSON вывода
TEMP_QUERY_RESULT_FILE="upcoming_matches_query.json" # Имя временного файла для результатов запроса

# Полные пути к файлам
OUTPUT_TEXT_FILE="$OUTPUT_DIR/$UPCOMING_MATCHES_TEXT_FILE"
OUTPUT_JSON_FILE="$OUTPUT_DIR/$UPCOMING_MATCHES_JSON_FILE"
TEMP_RESULT_FILE="$TEMP_DIR/$TEMP_QUERY_RESULT_FILE"

# Путь к основному скрипту для получения кнопок
MATCH_BUTTONS_SCRIPT="./get_match_buttons.sh"

# Настройки отображения по умолчанию
DEFAULT_TIME_HOURS=1                        # Период времени в часах
DEFAULT_SPORT_FILTER=""                     # Фильтр по виду спорта
DEFAULT_SHOW_OUTCOME_TYPES=false            # Показывать ли типы исходов
DEFAULT_OUTPUT_FORMAT="text"                # Формат вывода (text/json)

###############################
# ИНИЦИАЛИЗАЦИЯ
###############################

# Создаем необходимые директории
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR"
mkdir -p "$CONFIG_SETTINGS_DIR"

# Загружаем переменные окружения
source .env

# URL API из переменных окружения
GRAPH_URL=${MAINNET_GRAPH_URL:-"https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3"}

###############################
# ФУНКЦИИ
###############################

# Функция для форматирования времени в человекочитаемый вид
format_timestamp() {
  local timestamp=$1
  date -d @$timestamp "+%Y-%m-%d %H:%M:%S"
}

# Функция для определения времени в секундах
get_timestamp() {
  date +%s
}

# Функция для обработки матча в JSON формате
process_match_json() {
  # JSON вывод
  if [ $MATCH_INDEX -gt 0 ]; then
    echo "," >> "$JSON_FILE"
  fi
  
  echo "    {" >> "$JSON_FILE"
  echo "      \"id\": \"$FULL_ID\"," >> "$JSON_FILE"
  echo "      \"gameId\": \"$GAME_ID\"," >> "$JSON_FILE"
  echo "      \"title\": \"$TITLE\"," >> "$JSON_FILE"
  echo "      \"sport\": \"$SPORT\"," >> "$JSON_FILE"
  echo "      \"league\": \"$LEAGUE\"," >> "$JSON_FILE"
  echo "      \"country\": \"$COUNTRY\"," >> "$JSON_FILE"
  echo "      \"startsAt\": \"$START_TIME\"," >> "$JSON_FILE"
  echo "      \"timeLeft\": \"${HOURS_LEFT}ч ${MINUTES_LEFT}м\"," >> "$JSON_FILE"
  
  # Добавляем основные типы ставок
  echo "      \"mainOutcomes\": [" >> "$JSON_FILE"
  
  # Обработка основного исхода (1X2 или moneyline)
  if [ ! -z "$MAIN_OUTCOME_CONDITION" ]; then
    CONDITION_ID=$(echo $MAIN_OUTCOME_CONDITION | jq -r '.conditionId')
    OUTCOMES=$(echo $MAIN_OUTCOME_CONDITION | jq -c '.outcomes[]')
    
    OUTCOMES_INDEX=0
    echo "$OUTCOMES" | while read -r outcome; do
      OUTCOME_ID=$(echo $outcome | jq -r '.outcomeId')
      ODDS=$(echo $outcome | jq -r '.currentOdds')
      NAME=$(echo $outcome | jq -r '.selectionName')
      
      if [ $OUTCOMES_INDEX -gt 0 ]; then
        echo "," >> "$JSON_FILE"
      fi
      
      echo "        {" >> "$JSON_FILE"
      echo "          \"type\": \"1X2\"," >> "$JSON_FILE"
      echo "          \"name\": \"$NAME\"," >> "$JSON_FILE"
      echo "          \"odds\": $ODDS," >> "$JSON_FILE"
      echo "          \"conditionId\": \"$CONDITION_ID\"," >> "$JSON_FILE"
      echo "          \"outcomeId\": \"$OUTCOME_ID\"," >> "$JSON_FILE"
      echo "          \"buttonCommand\": \"$MATCH_BUTTONS_SCRIPT -c $CONDITION_ID -o $OUTCOME_ID $FULL_ID\"" >> "$JSON_FILE"
      echo "        }" >> "$JSON_FILE"
      
      OUTCOMES_INDEX=$((OUTCOMES_INDEX + 1))
    done
  fi
  
  echo "      ]" >> "$JSON_FILE"
  echo "    }" >> "$JSON_FILE"
}

# Функция для обработки матча в текстовом формате
process_match_text() {
  # Текстовый вывод
  echo "=== Матч #$((MATCH_INDEX + 1)) ===" >> "$RESULT_FILE"
  echo "Название: $TITLE" >> "$RESULT_FILE"
  echo "ID: $GAME_ID" >> "$RESULT_FILE"
  echo "Спорт: $SPORT" >> "$RESULT_FILE"
  echo "Лига: $LEAGUE ($COUNTRY)" >> "$RESULT_FILE"
  echo "Начало: $START_TIME (через ${HOURS_LEFT}ч ${MINUTES_LEFT}м)" >> "$RESULT_FILE"
  echo "" >> "$RESULT_FILE"
  
  # Добавляем информацию о доступных ставках
  if [ "$SHOW_OUTCOME_TYPES" = true ]; then
    echo "--- Доступные ставки ---" >> "$RESULT_FILE"
    
    # Обработка основного исхода (1X2 или moneyline)
    if [ ! -z "$MAIN_OUTCOME_CONDITION" ]; then
      CONDITION_ID=$(echo $MAIN_OUTCOME_CONDITION | jq -r '.conditionId')
      MARKET_NAME=$(echo $MAIN_OUTCOME_CONDITION | jq -r '.marketName')
      
      echo "Тип: 1X2 (Основной исход)" >> "$RESULT_FILE"
      
      # Вывод каждого исхода с командой для ставки
      echo "$MAIN_OUTCOME_CONDITION" | jq -c '.outcomes[]' | while read -r outcome; do
        OUTCOME_ID=$(echo $outcome | jq -r '.outcomeId')
        ODDS=$(echo $outcome | jq -r '.currentOdds')
        NAME=$(echo $outcome | jq -r '.selectionName')
        
        printf "  %-5s  %10.2f  Команда: %s -c %s -o %s %s\n" \
          "$NAME" "$ODDS" "$MATCH_BUTTONS_SCRIPT" "$CONDITION_ID" "$OUTCOME_ID" "$FULL_ID" >> "$RESULT_FILE"
      done
    fi
    
    # Обработка тоталов
    if [ ! -z "$TOTALS_CONDITION" ]; then
      CONDITION_ID=$(echo $TOTALS_CONDITION | jq -r '.conditionId')
      PARAMETER=$(echo $TOTALS_CONDITION | jq -r '.parameterX')
      
      echo -e "\nТип: Тотал $PARAMETER" >> "$RESULT_FILE"
      
      # Вывод каждого исхода с командой для ставки
      echo "$TOTALS_CONDITION" | jq -c '.outcomes[]' | while read -r outcome; do
        OUTCOME_ID=$(echo $outcome | jq -r '.outcomeId')
        ODDS=$(echo $outcome | jq -r '.currentOdds')
        NAME=$(echo $outcome | jq -r '.selectionName')
        
        printf "  %-12s  %10.2f  Команда: %s -c %s -o %s %s\n" \
          "$NAME" "$ODDS" "$MATCH_BUTTONS_SCRIPT" "$CONDITION_ID" "$OUTCOME_ID" "$FULL_ID" >> "$RESULT_FILE"
      done
    fi
  fi
  
  echo -e "\nКоманда для получения всех ставок:\n$MATCH_BUTTONS_SCRIPT $FULL_ID\n" >> "$RESULT_FILE"
  echo "-------------------------------------------------------" >> "$RESULT_FILE"
  echo "" >> "$RESULT_FILE"
}

# Функция для вывода справки
show_help() {
  echo "Использование: $0 [ОПЦИИ]"
  echo ""
  echo "Опции:"
  echo "  -h, --help            Показать эту справку"
  echo "  -s, --sport SPORT     Фильтровать по виду спорта (например: 'Football', 'Basketball')"
  echo "  -t, --time HOURS      Период времени в часах (по умолчанию: $DEFAULT_TIME_HOURS час)"
  echo "  -o, --outcome-type    Показывать наиболее популярные типы исходов"
  echo "  -j, --json            Вывод в формате JSON"
  echo ""
  echo "Примеры:"
  echo "  $0                     # Показать матчи на ближайший час"
  echo "  $0 --sport Football    # Показать только футбольные матчи"
  echo "  $0 --time 3            # Показать матчи на ближайшие 3 часа"
  echo ""
  echo "Файлы:"
  echo "  Настройки:            $CONFIG_SETTINGS_DIR/"
  echo "  Результаты (текст):   $OUTPUT_TEXT_FILE"
  echo "  Результаты (JSON):    $OUTPUT_JSON_FILE"
  echo "  Временные файлы:      $TEMP_DIR/"
  echo ""
}

###############################
# ОБРАБОТКА ПАРАМЕТРОВ
###############################

# Значения по умолчанию для параметров
SPORT_FILTER="$DEFAULT_SPORT_FILTER"
TIME_HOURS="$DEFAULT_TIME_HOURS"
SHOW_OUTCOME_TYPES="$DEFAULT_SHOW_OUTCOME_TYPES"
OUTPUT_FORMAT="$DEFAULT_OUTPUT_FORMAT"

# Обработка параметров командной строки
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -s|--sport)
      SPORT_FILTER="$2"
      shift 2
      ;;
    -t|--time)
      TIME_HOURS="$2"
      shift 2
      ;;
    -o|--outcome-type)
      SHOW_OUTCOME_TYPES=true
      shift
      ;;
    -j|--json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    *)
      echo "Неизвестный параметр: $1"
      show_help
      exit 1
      ;;
  esac
done

###############################
# ОСНОВНОЙ КОД
###############################

# Вычисляем временной диапазон для запроса матчей
CURRENT_TIME=$(get_timestamp)
END_TIME=$((CURRENT_TIME + TIME_HOURS * 3600))

echo "Поиск матчей, начинающихся в период: $(format_timestamp $CURRENT_TIME) - $(format_timestamp $END_TIME)"
if [ -n "$SPORT_FILTER" ]; then
  echo "Фильтр по виду спорта: $SPORT_FILTER"
fi

# Формируем GraphQL запрос для получения предстоящих матчей
UPCOMING_MATCHES_QUERY='{
  "query": "query GetUpcomingMatches($startTime: Int!, $endTime: Int!, $sportFilter: String) { 
    games(
      where: {
        startsAt_gte: $startTime,
        startsAt_lte: $endTime,
        status: \\"Created\\",
        sport_: {name_contains_nocase: $sportFilter}
      }
      orderBy: startsAt
    ) { 
      id 
      gameId 
      title 
      startsAt 
      sport { 
        name 
      } 
      league { 
        name 
        country {
          name
        }
      } 
      conditions(first: 10) { 
        conditionId 
        marketName
        parameterX
        outcomes { 
          outcomeId 
          currentOdds
          selectionName
          title
        } 
      } 
    } 
  }",
  "variables": {
    "startTime": '$CURRENT_TIME',
    "endTime": '$END_TIME',
    "sportFilter": '$([ -n "$SPORT_FILTER" ] && echo "\"$SPORT_FILTER\"" || echo "null")'
  }
}'

# Выполняем запрос к API
echo "Отправляем запрос к API Azuro..."
QUERY_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$UPCOMING_MATCHES_QUERY" \
  $GRAPH_URL)

# Сохраняем результат в файл
echo $QUERY_RESULT | jq . > "$TEMP_RESULT_FILE"

# Проверяем, есть ли ошибки
if [[ $(echo $QUERY_RESULT | jq 'has("errors")') == "true" ]]; then
  echo "Ошибка при выполнении запроса:"
  echo $QUERY_RESULT | jq '.errors'
  exit 1
fi

# Получаем список матчей
MATCHES=$(echo $QUERY_RESULT | jq -c '.data.games[]')
MATCH_COUNT=$(echo $QUERY_RESULT | jq '.data.games | length')

if [ "$MATCH_COUNT" -eq "0" ]; then
  echo "Не найдено матчей на ближайшие $TIME_HOURS час(ов)."
  exit 0
fi

echo "Найдено матчей: $MATCH_COUNT"

###############################
# ФОРМИРОВАНИЕ ВЫВОДА
###############################

# Создаем файл для вывода
RESULT_FILE="$OUTPUT_TEXT_FILE"
JSON_FILE="$OUTPUT_JSON_FILE"

# Если вывод в JSON, инициализируем файл
if [ "$OUTPUT_FORMAT" = "json" ]; then
  echo "{" > "$JSON_FILE"
  echo "  \"matchCount\": $MATCH_COUNT," >> "$JSON_FILE"
  echo "  \"timeRange\": {" >> "$JSON_FILE"
  echo "    \"start\": \"$(format_timestamp $CURRENT_TIME)\"," >> "$JSON_FILE"
  echo "    \"end\": \"$(format_timestamp $END_TIME)\"" >> "$JSON_FILE"
  echo "  }," >> "$JSON_FILE"
  echo "  \"matches\": [" >> "$JSON_FILE"
else
  echo "==== ПРЕДСТОЯЩИЕ МАТЧИ ====" > "$RESULT_FILE"
  echo "Период: $(format_timestamp $CURRENT_TIME) - $(format_timestamp $END_TIME)" >> "$RESULT_FILE"
  echo "Всего матчей: $MATCH_COUNT" >> "$RESULT_FILE"
  echo "" >> "$RESULT_FILE"
fi

# Обрабатываем каждый матч
MATCH_INDEX=0
echo "$MATCHES" | while read -r match; do
  # Извлекаем основную информацию о матче
  GAME_ID=$(echo $match | jq -r '.gameId')
  TITLE=$(echo $match | jq -r '.title')
  STARTS_AT=$(echo $match | jq -r '.startsAt')
  SPORT=$(echo $match | jq -r '.sport.name')
  LEAGUE=$(echo $match | jq -r '.league.name')
  COUNTRY=$(echo $match | jq -r '.country.name')
  FULL_ID=$(echo $match | jq -r '.id')
  
  # Форматированные данные матча для текстового вывода
  START_TIME=$(format_timestamp $STARTS_AT)
  TIME_LEFT=$(( STARTS_AT - CURRENT_TIME ))
  HOURS_LEFT=$(( TIME_LEFT / 3600 ))
  MINUTES_LEFT=$(( (TIME_LEFT % 3600) / 60 ))
  
  # Получаем информацию о популярных типах ставок для этого матча
  MAIN_OUTCOME_CONDITION=$(echo $match | jq -c '.conditions[] | select(.marketName=="1x2" or .marketName=="money_line")')
  TOTALS_CONDITION=$(echo $match | jq -c '.conditions[] | select(.marketName=="totals")')
  
  # Формирование команды для запуска в зависимости от формата вывода
  if [ "$OUTPUT_FORMAT" = "json" ]; then
    process_match_json
  else
    process_match_text
  fi
  
  MATCH_INDEX=$((MATCH_INDEX + 1))
done

# Завершаем JSON структуру
if [ "$OUTPUT_FORMAT" = "json" ]; then
  echo "  ]" >> "$JSON_FILE"
  echo "}" >> "$JSON_FILE"
  echo "Результаты сохранены в файл $JSON_FILE"
  cat "$JSON_FILE" | jq .
else
  echo "Результаты сохранены в файл $RESULT_FILE"
  cat "$RESULT_FILE"
fi

exit 0 