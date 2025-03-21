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

# Настройки API
GRAPH_URL="https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3"

# Значения по умолчанию
DEFAULT_TIME_HOURS=1
DEFAULT_SPORT_FILTER=""

# Пути к файлам и директориям
TEMP_DIR="./config/temp"
CONFIG_DIR="./config"
SETTINGS_DIR="$CONFIG_DIR/settings"
OUTPUT_DIR="$CONFIG_DIR/output"

OUTPUT_TEXT_FILE="$OUTPUT_DIR/upcoming_matches.txt"
OUTPUT_JSON_FILE="$OUTPUT_DIR/upcoming_matches.json"
TEMP_RESULT_FILE="$TEMP_DIR/api_response.json"
DEBUG_LOG_FILE="$OUTPUT_DIR/debug.log"
SCRIPT_LOG_FILE="$TEMP_DIR/script_log.txt"

# Создаем необходимые директории
mkdir -p "$TEMP_DIR" 2>/dev/null
mkdir -p "$SETTINGS_DIR" 2>/dev/null
mkdir -p "$OUTPUT_DIR" 2>/dev/null

# Переменные для вывода
RESULT_FILE="$OUTPUT_TEXT_FILE"
JSON_FILE="$OUTPUT_JSON_FILE"
LOG_FILE="$SCRIPT_LOG_FILE"

###############################
# Вспомогательные функции
###############################

# Функция для форматирования timestamp в человекочитаемый формат
format_timestamp() {
  date -d @"$1" +"%Y-%m-%d %H:%M:%S"
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
  echo "  --no-redirect         Выводить результат в консоль, а не только в файл"
  echo "  --debug               Сохранять отладочные сообщения в файл ($DEBUG_LOG_FILE)"
  echo ""
  echo "Примеры:"
  echo "  $0                     # Показать матчи на ближайший час"
  echo "  $0 --sport Football    # Показать только футбольные матчи"
  echo "  $0 --time 3            # Показать матчи на ближайшие 3 часа"
  echo "  $0 --json              # Вывод в формате JSON"
  echo "  $0 --no-redirect       # Вывод результатов в консоль"
  echo ""
  echo "Файлы:"
  echo "  Настройки:            $SETTINGS_DIR/"
  echo "  Результаты (текст):   $OUTPUT_TEXT_FILE"
  echo "  Результаты (JSON):    $OUTPUT_JSON_FILE"
  echo "  Временные файлы:      $TEMP_DIR/"
  echo "  Отладочные логи:      $DEBUG_LOG_FILE"
}

# Функция для вывода отладочных сообщений
debug_log() {
  if [ "$DEBUG_MODE" = "true" ]; then
    echo "DEBUG: $1" >> "$DEBUG_LOG_FILE"
    
    # Если указан второй аргумент (JSON-объект), форматируем его красиво
    if [ -n "$2" ]; then
      echo "$2" >> "$DEBUG_LOG_FILE"
      echo "" >> "$DEBUG_LOG_FILE"
    fi
  fi
}

# Функция для логирования
log_message() {
  MESSAGE="$1"
  
  # Если указан режим отладки, записываем все сообщения в лог
  if [ "$DEBUG_MODE" = "true" ]; then
    echo "$MESSAGE" >> "$DEBUG_LOG_FILE"
  fi
  
  # Если перенаправление включено, записываем в файл, иначе в консоль
  if [ "$REDIRECT_OUTPUT" = "true" ]; then
    echo "$MESSAGE" >> "$LOG_FILE"
  else
    echo "$MESSAGE"
  fi
}

# Инициализируем файлы с результатами
initialize_output_files() {
  # Создаем директории для вывода, если они не существуют
  mkdir -p "$(dirname "$RESULT_FILE")" 2>/dev/null
  mkdir -p "$(dirname "$JSON_FILE")" 2>/dev/null
  
  # Очищаем файлы перед записью
  > "$RESULT_FILE"
  > "$JSON_FILE"
  > "$LOG_FILE"
  
  # Очищаем файл для отладочных сообщений, если включен режим отладки
  if [ "$DEBUG_MODE" = "true" ]; then
    > "$DEBUG_LOG_FILE"
  fi
  
  # Инициализируем структуру JSON файла
  if [ "$OUTPUT_FORMAT" = "json" ]; then
    echo "[]" > "$JSON_FILE"
  else
    echo "==== ПРЕДСТОЯЩИЕ МАТЧИ ====" > "$RESULT_FILE"
    echo "Период: $(format_timestamp $CURRENT_TIME) - $(format_timestamp $END_TIME)" >> "$RESULT_FILE"
    echo "=============================\n" >> "$RESULT_FILE"
  fi
}

# Функция для обработки матча в формате JSON
process_match_json() {
  local MATCH_JSON="{"
  MATCH_JSON+="\"id\":\"$GAME_ID\","
  MATCH_JSON+="\"title\":\"$TITLE\","
  MATCH_JSON+="\"sport\":\"$SPORT_NAME\","
  MATCH_JSON+="\"league\":\"$LEAGUE_NAME\","
  MATCH_JSON+="\"country\":\"$COUNTRY_NAME\","
  MATCH_JSON+="\"startsAt\":\"$START_TIME\","
  MATCH_JSON+="\"timeLeft\":\"${HOURS_LEFT}ч ${MINUTES_LEFT}м\","
  
  # Информация о командах
  MATCH_JSON+="\"teams\":["
  MATCH_JSON+="{\"name\":\"$TEAM1_NAME\",\"position\":1},"
  MATCH_JSON+="{\"name\":\"$TEAM2_NAME\",\"position\":2}"
  MATCH_JSON+="],"
  
  # Коэффициенты
  MATCH_JSON+="\"odds\":{"
  
  # Проверяем наличие каждого коэффициента и добавляем его при наличии
  local ODDS_ADDED=false
  
  if [ -n "$WIN1_COEF" ]; then
    MATCH_JSON+="\"win1\":\"$WIN1_COEF\""
    ODDS_ADDED=true
  fi
  
  if [ -n "$WINX_COEF" ]; then
    if [ "$ODDS_ADDED" = true ]; then
      MATCH_JSON+=","
    fi
    MATCH_JSON+="\"winX\":\"$WINX_COEF\""
    ODDS_ADDED=true
  fi
  
  if [ -n "$WIN2_COEF" ]; then
    if [ "$ODDS_ADDED" = true ]; then
      MATCH_JSON+=","
    fi
    MATCH_JSON+="\"win2\":\"$WIN2_COEF\""
  fi
  
  MATCH_JSON+="}"
  MATCH_JSON+="}"
  
  # Добавляем матч в общий массив
  if [ "$MATCH_INDEX" -gt 0 ]; then
    # Если это не первый матч, читаем текущее содержимое файла и добавляем новый матч
    local CURRENT_JSON=$(cat "$JSON_FILE")
    # Удаляем закрывающую квадратную скобку
    CURRENT_JSON="${CURRENT_JSON%]}"
    # Добавляем запятую, если это не первый элемент
    CURRENT_JSON="${CURRENT_JSON},"
    # Добавляем новый матч и закрывающую скобку
    echo "${CURRENT_JSON}${MATCH_JSON}]" > "$JSON_FILE"
  else
    # Если это первый матч, создаем новый массив
    echo "[$MATCH_JSON]" > "$JSON_FILE"
  fi
  
  # Увеличиваем счетчик матчей
  MATCH_INDEX=$((MATCH_INDEX + 1))
}

# Функция для обработки матча в текстовом формате
process_match_text() {
  # Текстовый вывод
  echo "=== Матч #$((MATCH_INDEX + 1)) ===" >> "$RESULT_FILE"
  echo "Название: $TITLE" >> "$RESULT_FILE"
  echo "ID: $GAME_ID" >> "$RESULT_FILE"
  echo "Спорт: $SPORT_NAME" >> "$RESULT_FILE"
  echo "Лига: $LEAGUE_NAME ($COUNTRY_NAME)" >> "$RESULT_FILE"
  echo "Начало: $START_TIME (через ${HOURS_LEFT}ч ${MINUTES_LEFT}м)" >> "$RESULT_FILE"
  echo "" >> "$RESULT_FILE"
  
  # Проверяем наличие коэффициентов на популярные типы ставок
  if [ -n "$WIN1_COEF" ] || [ -n "$WINX_COEF" ] || [ -n "$WIN2_COEF" ]; then
    echo "  Коэффициенты:" >> "$RESULT_FILE"
    
    if [ -n "$WIN1_COEF" ]; then
      echo "    П1: $WIN1_COEF" >> "$RESULT_FILE"
    fi
    
    if [ -n "$WINX_COEF" ]; then
      echo "    Ничья: $WINX_COEF" >> "$RESULT_FILE"
    fi
    
    if [ -n "$WIN2_COEF" ]; then
      echo "    П2: $WIN2_COEF" >> "$RESULT_FILE"
    fi
    
    echo "" >> "$RESULT_FILE"
  fi
  
  # Увеличиваем счетчик матчей
  MATCH_INDEX=$((MATCH_INDEX + 1))
}

###############################
# Парсинг параметров командной строки
###############################

# Парсим аргументы командной строки
OUTPUT_FORMAT="text"
SHOW_OUTCOME_TYPES=false
TIME_HOURS=$DEFAULT_TIME_HOURS
SPORT_FILTER=""
REDIRECT_OUTPUT=true
DEBUG_MODE=false

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
    --no-redirect)
      REDIRECT_OUTPUT=false
      shift
      ;;
    --debug)
      DEBUG_MODE=true
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
# Основной блок скрипта
###############################

# Запрашиваем текущее время в формате Unix timestamp
CURRENT_TIME=$(date +%s)
END_TIME=$((CURRENT_TIME + TIME_HOURS * 3600))

# Инициализируем файлы вывода
initialize_output_files

# Информация о конфигурации запроса
log_message "Используем Azuro API: $GRAPH_URL"
log_message "Поиск матчей, начинающихся в период: $(format_timestamp $CURRENT_TIME) - $(format_timestamp $END_TIME)"
if [ -n "$SPORT_FILTER" ]; then
  log_message "Фильтр по виду спорта: $SPORT_FILTER"
fi

# Формируем GraphQL запрос на получение предстоящих матчей
UPCOMING_MATCHES_QUERY=$(cat <<EOF
{
  "query": "query GetUpcomingMatches(\$where: Sport_filter, \$gamesWhere: Game_filter) { sports(where: \$where) { name countries { name leagues { name games(where: \$gamesWhere, orderBy: startsAt) { id gameId title startsAt status participants { name sortOrder } conditions(first: 10) { conditionId status title reinforcement outcomes { outcomeId currentOdds title sortOrder } } } } } } }",
  "variables": {
    "where": $([ -n "$SPORT_FILTER" ] && echo "{\"name_contains_nocase\": \"$SPORT_FILTER\"}" || echo null),
    "gamesWhere": {"status": "Created", "startsAt_gte": $CURRENT_TIME, "startsAt_lte": $END_TIME}
  }
}
EOF
)

# Выводим информацию о запросе для отладки
debug_log "Выполняется запрос к Azuro subgraph с параметрами:" 
debug_log "Временной интервал: $CURRENT_TIME - $END_TIME"
debug_log "Фильтр вида спорта:" "$([ -n "$SPORT_FILTER" ] && echo "{\"name_contains_nocase\": \"$SPORT_FILTER\"}" || echo "null")"

# Выполняем запрос к API
log_message "Отправляем запрос к API Azuro..."
QUERY_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$UPCOMING_MATCHES_QUERY" \
  $GRAPH_URL)

# Проверяем, получен ли ответ от API
if [ -z "$QUERY_RESULT" ]; then
  log_message "Ошибка: Не удалось получить ответ от API."
  echo "[]" > "$JSON_FILE"
  echo "Не удалось получить ответ от API." > "$RESULT_FILE"
  exit 1
fi

# Сохраняем результат в файл
echo "$QUERY_RESULT" > "$TEMP_RESULT_FILE"

# Проверяем, есть ли ошибки в ответе
if [[ $(echo "$QUERY_RESULT" | jq -r 'has("errors")') == "true" ]]; then
  log_message "Ошибка при выполнении запроса:"
  echo "$QUERY_RESULT" | jq -r '.errors' >> "$DEBUG_LOG_FILE"
  echo "[]" > "$JSON_FILE"
  echo "Ошибка API: $(echo "$QUERY_RESULT" | jq -r '.errors[0].message')" > "$RESULT_FILE"
  exit 1
fi

# Проверяем наличие данных в ответе
SPORTS_COUNT=$(echo "$QUERY_RESULT" | jq -r '.data.sports | length')
debug_log "Количество видов спорта в ответе:" "$SPORTS_COUNT"

# Если нет данных, завершаем работу
if [ "$SPORTS_COUNT" -eq "0" ] || [ -z "$(echo "$QUERY_RESULT" | jq -r '.data.sports')" ]; then
  log_message "Не найдено матчей на ближайшие $TIME_HOURS час(ов)."
  echo "[]" > "$JSON_FILE"
  echo "Не найдено матчей на ближайшие $TIME_HOURS час(ов)." > "$RESULT_FILE"
  exit 0
fi

# Подсчитываем общее количество матчей
MATCH_COUNT=0
for i in $(seq 0 $((SPORTS_COUNT-1))); do
  SPORT=$(echo "$QUERY_RESULT" | jq -r ".data.sports[$i]")
  COUNTRIES_COUNT=$(echo "$SPORT" | jq -r '.countries | length')
  
  for j in $(seq 0 $((COUNTRIES_COUNT-1))); do
    COUNTRY=$(echo "$SPORT" | jq -r ".countries[$j]")
    LEAGUES_COUNT=$(echo "$COUNTRY" | jq -r '.leagues | length')
    
    for k in $(seq 0 $((LEAGUES_COUNT-1))); do
      LEAGUE=$(echo "$COUNTRY" | jq -r ".leagues[$k]")
      GAMES_COUNT=$(echo "$LEAGUE" | jq -r '.games | length')
      MATCH_COUNT=$((MATCH_COUNT + GAMES_COUNT))
    done
  done
done

debug_log "Общее количество найденных матчей:" "$MATCH_COUNT"

# Проверяем, найдены ли матчи
if [ -z "$MATCH_COUNT" ] || [ "$MATCH_COUNT" -eq "0" ]; then
  log_message "Не найдено матчей на ближайшие $TIME_HOURS час(ов)."
  echo "[]" > "$JSON_FILE"
  echo "Не найдено матчей на ближайшие $TIME_HOURS час(ов)." > "$RESULT_FILE"
  exit 0
fi

log_message "Найдено матчей: $MATCH_COUNT"

###############################
# Обработка и вывод данных о матчах
###############################

# Инициализируем счетчик матчей
MATCH_INDEX=0

# Перебираем все виды спорта
for i in $(seq 0 $((SPORTS_COUNT-1))); do
  SPORT=$(echo "$QUERY_RESULT" | jq -r ".data.sports[$i]")
  SPORT_NAME=$(echo "$SPORT" | jq -r '.name')
  COUNTRIES_COUNT=$(echo "$SPORT" | jq -r '.countries | length')
  
  for j in $(seq 0 $((COUNTRIES_COUNT-1))); do
    COUNTRY=$(echo "$SPORT" | jq -r ".countries[$j]")
    COUNTRY_NAME=$(echo "$COUNTRY" | jq -r '.name')
    LEAGUES_COUNT=$(echo "$COUNTRY" | jq -r '.leagues | length')
    
    for k in $(seq 0 $((LEAGUES_COUNT-1))); do
      LEAGUE=$(echo "$COUNTRY" | jq -r ".leagues[$k]")
      LEAGUE_NAME=$(echo "$LEAGUE" | jq -r '.name')
      GAMES_COUNT=$(echo "$LEAGUE" | jq -r '.games | length')
      
      for l in $(seq 0 $((GAMES_COUNT-1))); do
        MATCH=$(echo "$LEAGUE" | jq -r ".games[$l]")
        
        # Извлекаем основные данные о матче
        FULL_ID=$(echo "$MATCH" | jq -r '.id')
        GAME_ID=$(echo "$MATCH" | jq -r '.gameId')
        TITLE=$(echo "$MATCH" | jq -r '.title')
        START_TIMESTAMP=$(echo "$MATCH" | jq -r '.startsAt')
        STATUS=$(echo "$MATCH" | jq -r '.status')
        
        # Получаем имена команд-участников
        PARTICIPANTS=$(echo "$MATCH" | jq -r '.participants')
        TEAM1_NAME=$(echo "$PARTICIPANTS" | jq -r '.[0].name')
        TEAM2_NAME=$(echo "$PARTICIPANTS" | jq -r '.[1].name')
        
        # Форматируем время начала матча и вычисляем, через сколько часов и минут он начнется
        START_TIME=$(format_timestamp "$START_TIMESTAMP")
        TIME_DIFF=$((START_TIMESTAMP - CURRENT_TIME))
        HOURS_LEFT=$((TIME_DIFF / 3600))
        MINUTES_LEFT=$(( (TIME_DIFF % 3600) / 60 ))
        
        # Диагностика структуры матча и его условий
        if [ "$MATCH_INDEX" -eq 0 ]; then
          debug_log "Условия матча $TITLE:" "$(echo "$MATCH" | jq -r '.conditions')"
        fi
        
        # Получаем данные о коэффициентах
        # Берем первое условие для получения основных коэффициентов
        FIRST_CONDITION=$(echo "$MATCH" | jq -r '.conditions[0]')
        
        # Инициализируем переменные для коэффициентов
        WIN1_COEF=""
        WINX_COEF=""
        WIN2_COEF=""

        # Обрабатываем исходы по их порядковому номеру (sortOrder) и outcomeId
        if [ -n "$FIRST_CONDITION" ]; then
          # Для диагностики первого матча
          if [ "$MATCH_INDEX" -eq 0 ]; then
            debug_log "Первое условие для $TITLE:" "$FIRST_CONDITION"
          fi
          
          # Получаем количество исходов
          OUTCOMES_COUNT=$(echo "$FIRST_CONDITION" | jq -r '.outcomes | length')
          
          for ((i=0; i<$OUTCOMES_COUNT; i++)); do
            OUTCOME=$(echo "$FIRST_CONDITION" | jq -r ".outcomes[$i]")
            SORT_ORDER=$(echo "$OUTCOME" | jq -r '.sortOrder')
            ODDS=$(echo "$OUTCOME" | jq -r '.currentOdds')
            
            # Присваиваем коэффициенты по sortOrder
            if [ "$SORT_ORDER" = "0" ]; then
              WIN1_COEF=$ODDS
            elif [ "$SORT_ORDER" = "1" ]; then
              WINX_COEF=$ODDS
            elif [ "$SORT_ORDER" = "2" ]; then
              WIN2_COEF=$ODDS
            fi
          done
          
          # Для диагностики первого матча
          if [ "$MATCH_INDEX" -eq 0 ]; then
            debug_log "Итоговые коэффициенты:" "{ \"win1\": \"$WIN1_COEF\", \"winX\": \"$WINX_COEF\", \"win2\": \"$WIN2_COEF\" }"
          fi
        fi
        
        # Обработка матча в зависимости от формата вывода
        if [ "$OUTPUT_FORMAT" = "json" ]; then
          process_match_json
        else
          process_match_text
        fi
      done
    done
  done
done

# Завершаем вывод данных
log_message "Всего обработано матчей: $MATCH_INDEX"

if [ "$OUTPUT_FORMAT" = "json" ]; then
  log_message "Результаты сохранены в файл $JSON_FILE"
  if [ "$REDIRECT_OUTPUT" = "false" ]; then
    cat "$JSON_FILE"
  fi
else
  log_message "Результаты сохранены в файл $RESULT_FILE"
  if [ "$REDIRECT_OUTPUT" = "false" ]; then
    cat "$RESULT_FILE"
  fi
fi

exit 0 