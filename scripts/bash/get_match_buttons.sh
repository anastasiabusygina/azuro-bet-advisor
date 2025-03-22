#!/bin/bash

###############################
# AZURO MATCH BUTTONS VIEWER
###############################
# Скрипт для получения информации о ставках на конкретный матч 
# из API Azuro Protocol и отображения их в формате, соответствующем UI.
#
# Использование:
#   ./get_match_buttons.sh [опции] GAME_ID
#   ./get_match_buttons.sh -c CONDITION_ID -o OUTCOME_ID GAME_ID
#
# Сохраняет результаты в:
#   - config/output/match_buttons.txt (текстовый формат)
#   - config/output/match_buttons.json (JSON формат)
###############################

# Настройки и конфигурация

# Директория с конфигурационными файлами
CONFIG_DIR="config"
MATCH_DATA_DIR="$CONFIG_DIR/match_data"
OUTPUT_DIR="$CONFIG_DIR/output"
TEMP_DIR="$CONFIG_DIR/temp"

# Создаем необходимые директории, если их нет
mkdir -p "$MATCH_DATA_DIR"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR"

# Пути к файлам результатов
OUTPUT_TEXT_FILE="$OUTPUT_DIR/match_buttons.txt"
OUTPUT_JSON_FILE="$OUTPUT_DIR/match_buttons.json"
SEARCH_RESULT_FILE="$TEMP_DIR/search_result.json"
MATCH_DATA_FILE="$TEMP_DIR/match_data.json"

# Значения по умолчанию для параметров
USE_LOCAL=false
USE_API=true
AUTO_UPDATE=false
QUIET_MODE="true"
OUTPUT_FORMAT="text"
FILTER_BET_TYPE=""
CONDITION_ID=""
OUTCOME_ID=""
HIGHLIGHT_RECOMMENDED=false
BUTTON_ONLY=false

# Функция для вывода справки
show_help() {
  echo "Использование: $0 [ОПЦИИ] [GAME_ID]"
  echo ""
  echo "Опции:"
  echo "  -h, --help            Показать эту справку"
  echo "  -l, --local-only      Использовать только локальные данные"
  echo "  -a, --api-only        Использовать только API (игнорировать локальные данные)"
  echo "  -u, --auto-update     Автоматически обновлять данные"
  echo "  -q, --quiet           Тихий режим (без интерактивных запросов)"
  echo "  -j, --json            Вывод в формате JSON"
  echo "  -f, --filter TYPE     Фильтровать по типу ставки (например: '1X2', 'Total')"
  echo "  -c, --condition ID    ID условия ставки (conditionId)"
  echo "  -o, --outcome ID      ID исхода ставки (outcomeId)"
  echo "  -r, --recommended     Выделить рекомендованную ставку"
  echo "  -b, --button-only     Показать только название рекомендуемой кнопки"
  echo ""
  echo "Примеры:"
  echo "  $0 1006000000000026759546             # Получить данные для указанного матча"
  echo "  $0 --local-only 1006000000000026759546 # Использовать только локальные данные"
  echo "  $0 --list                              # Показать список доступных матчей"
  echo "  $0 --condition ID --outcome ID GAME_ID # Выделить конкретную ставку"
  echo "  $0 --button-only -c ID -o ID GAME_ID   # Показать только название рекомендуемой кнопки"
  echo ""
}

# Функция для чтения JSON-поля из файла
get_json_value() {
  local file=$1
  local field=$2
  cat "$file" | jq -r "$field"
}

# Форматирование десятичного коэффициента в американский формат
format_american_odds() {
  local decimal_odds=$1
  
  # Проверяем, что входной параметр - число
  if [[ ! "$decimal_odds" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo ""
    return
  fi
  
  # Заменяем точку на запятую для корректной работы с локалью
  decimal_odds=$(echo "$decimal_odds" | tr '.' ',')
  
  # Простое форматирование без сложных вычислений
  # Просто добавляем знак + если коэффициент > 2.0
  if (( $(echo "$decimal_odds" | awk -F, '{print ($1 > 2 || ($1 == 2 && $2 > 0))}') )); then
    echo "+"
  else
    echo "-"
  fi
}

# Временно добавим вывод всех полученных данных для отладки
debug_recommended_bet() {
  local match_file=$1
  local condition_id=$2
  local outcome_id=$3
  
  # Выводим отладочную информацию только если quiet mode отключен
  if [ "$QUIET_MODE" = "false" ]; then
    echo "***** ОТЛАДКА РЕКОМЕНДОВАННОЙ СТАВКИ *****"
    echo "ConditionId: $condition_id"
    echo "OutcomeId: $outcome_id"
    
    # Получаем и выводим данные о ставке
    echo "Данные об условии (все поля):"
    jq --arg cid "$condition_id" '.conditions[] | select(.conditionId==$cid)' "$match_file"
    
    echo "Данные об исходе (все поля):"
    jq --arg cid "$condition_id" --arg oid "$outcome_id" '.conditions[] | select(.conditionId==$cid) | .outcomes[] | select(.outcomeId==($oid|tonumber))' "$match_file"
    
    echo "***** КОНЕЦ ОТЛАДКИ *****"
  fi
}

# Функция для обработки рекомендованной ставки
highlight_recommended_bet() {
  local match_file=$1
  local output_file=$2
  local condition_id=$3
  local outcome_id=$4
  
  # Получаем информацию о матче
  local title=$(jq -r '.title' "$match_file")
  local game_id=$(jq -r '.gameId' "$match_file")
  local status=$(jq -r '.status' "$match_file")
  local sport=$(jq -r '.sport' "$match_file")
  local league=$(jq -r '.league' "$match_file")
  local starts_at=$(jq -r '.startsAt' "$match_file")
  
  # Выводим информацию о матче
  echo -e "\n==== ИНФОРМАЦИЯ О МАТЧЕ ====" > "$output_file"
  echo "Название: $title" >> "$output_file"
  echo "ID: $game_id" >> "$output_file"
  echo "Статус: $status" >> "$output_file"
  echo "Спорт: $sport" >> "$output_file"
  echo "Лига: $league" >> "$output_file"
  echo "Дата начала: $starts_at" >> "$output_file"
  
  # Временный файл для всех ставок
  local all_bets_file=$(mktemp)
  
  # Формируем вывод всех доступных ставок в временный файл
  format_ui_style_output "$match_file" "$all_bets_file"
  
  # Ищем рекомендованную ставку
  if [ -n "$condition_id" ] && [ -n "$outcome_id" ]; then
    # Получаем информацию о рекомендованной ставке
    local condition=$(jq -r --arg cid "$condition_id" '.conditions[] | select(.conditionId==$cid)' "$match_file")
    
    if [ -n "$condition" ] && [ "$condition" != "null" ]; then
      local bet_type=$(echo "$condition" | jq -r '.betType')
      local parameter=$(echo "$condition" | jq -r '.parameter')
      local outcome=$(echo "$condition" | jq -r --arg oid "$outcome_id" '.outcomes[] | select(.outcomeId==($oid|tonumber))' 2>/dev/null)
      
      if [ -n "$outcome" ] && [ "$outcome" != "null" ]; then
        local title=$(echo "$outcome" | jq -r '.title')
        local coefficient=$(echo "$outcome" | jq -r '.coefficient')
        
        # Заменяем null заголовок на ID исхода
        if [ "$title" = "null" ]; then
          title="Outcome #$outcome_id"
        fi
        
        # Маркеры для привлечения внимания
        echo -e "\n★★★★★ РЕКОМЕНДОВАННАЯ СТАВКА ★★★★★" >> "$output_file"
        echo "Тип ставки: $bet_type" >> "$output_file"
        
        if [ "$parameter" != "null" ]; then
          echo "Параметр: $parameter" >> "$output_file"
        fi
        
        echo "Исход: $title" >> "$output_file"
        echo "Коэффициент: $coefficient ($(format_american_odds "$coefficient"))" >> "$output_file"
        echo "ConditionId: $condition_id" >> "$output_file"
        echo "OutcomeId: $outcome_id" >> "$output_file"
        echo "★★★★★★★★★★★★★★★★★★★★★★★★★★★★★" >> "$output_file"
      else
        echo -e "\n⚠️ ВНИМАНИЕ: Рекомендованный исход (outcome_id=$outcome_id) не найден в условии (condition_id=$condition_id)." >> "$output_file"
      fi
    else
      echo -e "\n⚠️ ВНИМАНИЕ: Рекомендованное условие (condition_id=$condition_id) не найдено." >> "$output_file"
    fi
  else
    echo -e "\n⚠️ ВНИМАНИЕ: Не указаны condition_id и/или outcome_id для рекомендованной ставки." >> "$output_file"
  fi
  
  # Добавляем список всех ставок в конец
  cat "$all_bets_file" >> "$output_file"
  
  # Удаляем временный файл
  rm -f "$all_bets_file"
}

# Функция для форматированного вывода данных в UI-стиле
format_ui_style_output() {
  local match_file=$1
  local output_file=$2
  
  echo -e "\n==== ДОСТУПНЫЕ СТАВКИ ====" >> "$output_file"
  
  # Получаем все условия из файла с данными о матче
  local conditions=$(jq -c '.conditions[]' "$match_file")
  
  # Если нет условий, выводим сообщение и завершаем работу
  if [ -z "$conditions" ]; then
    echo "Нет доступных ставок для этого матча." >> "$output_file"
    return
  fi
  
  # Перебираем все условия
  echo "$conditions" | while IFS= read -r condition; do
    local condition_id=$(echo "$condition" | jq -r '.conditionId')
    local bet_type=$(echo "$condition" | jq -r '.betType')
    local parameter=$(echo "$condition" | jq -r '.parameter')
    
    # Форматируем вывод условия
    if [ "$parameter" != "null" ]; then
      echo -e "\n* $bet_type ($parameter)" >> "$output_file"
    else
      echo -e "\n* $bet_type" >> "$output_file"
    fi
    
    # Получаем все исходы для данного условия
    local outcomes=$(echo "$condition" | jq -c '.outcomes[]')
    
    # Перебираем все исходы
    echo "$outcomes" | while IFS= read -r outcome; do
      local outcome_id=$(echo "$outcome" | jq -r '.outcomeId')
      local title=$(echo "$outcome" | jq -r '.title')
      local coefficient=$(echo "$outcome" | jq -r '.coefficient')
      
      # Если title не определен, используем outcomeId
      if [ "$title" = "null" ]; then
        title="Outcome #$outcome_id"
      fi
      
      # Добавляем исход в вывод
      if [[ "$coefficient" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        echo "  - $title: $coefficient ($(format_american_odds "$coefficient"))" >> "$output_file"
      else
        echo "  - $title: $coefficient" >> "$output_file"
      fi
    done
  done
}

# Функция для вывода только информации о рекомендуемой кнопке
show_recommended_button() {
  local match_file=$1
  local condition_id=$2
  local outcome_id=$3
  
  # Получаем информацию о рекомендованной ставке
  local condition=$(jq -r --arg cid "$condition_id" '.conditions[] | select(.conditionId==$cid)' "$match_file")
  
  if [ -n "$condition" ] && [ "$condition" != "null" ]; then
    local bet_type=$(echo "$condition" | jq -r '.betType')
    local parameter=$(echo "$condition" | jq -r '.parameter')
    local outcome=$(echo "$condition" | jq -r --arg oid "$outcome_id" '.outcomes[] | select(.outcomeId==($oid|tonumber))' 2>/dev/null)
    
    if [ -n "$outcome" ] && [ "$outcome" != "null" ]; then
      local title=$(echo "$outcome" | jq -r '.title')
      local coefficient=$(echo "$outcome" | jq -r '.coefficient')
      
      # Заменяем null заголовок на ID исхода
      if [ "$title" = "null" ]; then
        title="Outcome #$outcome_id"
      fi
      
      # Выводим только самую важную информацию
      echo "НАЖМИТЕ КНОПКУ: $bet_type"
      
      if [ "$parameter" != "null" ]; then
        echo "ПАРАМЕТР: $parameter"
      fi
      
      echo "ИСХОД: $title"
      echo "КОЭФФИЦИЕНТ: $coefficient"
    else
      echo "⚠️ Рекомендованный исход не найден"
    fi
  else
    echo "⚠️ Рекомендованное условие не найдено"
  fi
}

# Обработка параметров командной строки
while [[ $# -gt 0 ]]; do
  key="$1"
  
  case $key in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--local-only)
      USE_API=false
      USE_LOCAL=true
      shift
      ;;
    -a|--api-only)
      USE_API=true
      USE_LOCAL=false
      shift
      ;;
    -u|--auto-update)
      AUTO_UPDATE=true
      shift
      ;;
    -q|--quiet)
      QUIET_MODE="$2"
      shift 2
      ;;
    -j|--json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    -f|--filter)
      FILTER_BET_TYPE="$2"
      shift 2
      ;;
    -c|--condition)
      CONDITION_ID="$2"
      CONDITION_ID_PARAM="$2"  # Сохраняем для последующего сравнения
      shift 2
      ;;
    -o|--outcome)
      OUTCOME_ID="$2"
      OUTCOME_ID_PARAM="$2"    # Сохраняем для последующего сравнения
      shift 2
      ;;
    -r|--recommended)
      HIGHLIGHT_RECOMMENDED=true
      shift
      ;;
    -b|--button-only)
      BUTTON_ONLY=true
      shift
      ;;
    --no-cache)
      USE_LOCAL=false
      USE_API=true
      shift
      ;;
    --force)
      USE_LOCAL=false
      USE_API=true
      shift
      ;;
    -*)
      echo "Неизвестный параметр: $key"
      show_help
      exit 1
      ;;
    *)
      GAME_ID="$1"
      shift
      ;;
  esac
done

# Загружаем переменные окружения
source .env

# Используем URL API из переменных окружения
GRAPH_URL=$MAINNET_GRAPH_URL

# Проверяем доступность запрошенного файла с данными матча
if [ -z "$GAME_ID" ]; then
  echo "Ошибка: не указан ID матча."
  show_help
  exit 1
fi

# Сформировать имя файла для хранения данных о матче
MATCH_FILE="$TEMP_DIR/match_${GAME_ID}.json"

# Получаем данные о матче с API AZURO
echo "Используем Azuro API: $GRAPH_URL"
echo "Ищем информацию о матче с ID: $GAME_ID"

# Скрипт всегда будет использовать API и не будет пытаться использовать локальные данные
USE_LOCAL=false
USE_API=true

# Если используем API для получения данных
if [ "$USE_API" = true ]; then
  if [ "$QUIET_MODE" = false ]; then
    echo "Запрашиваем полную информацию о матче..."
  fi
  
  # Запрос для поиска матча по gameId в формате, соответствующем GraphQL
  echo "Поиск матча по gameId..."
  SEARCH_QUERY='{
    "query": "query GetGamesByGameId($gameId: String!) { games(where: {gameId: $gameId}) { id gameId title startsAt status sport { name } } }",
    "variables": {
      "gameId": "'$GAME_ID'"
    }
  }'

  SEARCH_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$SEARCH_QUERY" \
    $GRAPH_URL)

  # Отладочная информация
  if [ "$QUIET_MODE" = false ]; then
    echo "Результат поиска:"
    echo $SEARCH_RESULT | jq .
  fi

  # Проверяем, получен ли ответ от API
  if [ -z "$SEARCH_RESULT" ]; then
    echo "Ошибка: Не удалось получить ответ от API."
    exit 1
  fi

  # Проверяем количество найденных игр
  GAME_COUNT=$(echo $SEARCH_RESULT | jq '.data.games | length')
  
  if [ "$GAME_COUNT" -eq "0" ]; then
    if [ "$QUIET_MODE" = false ]; then
      echo "Матч с gameId $GAME_ID не найден."
    fi
    
    echo "Ошибка: матч не найден в API Azuro."
    exit 1
  else
    if [ "$QUIET_MODE" = false ]; then
      echo "Матч найден по gameId."
    fi
    
    # Получаем id матча для GraphQL запроса
    GRAPH_ID=$(echo $SEARCH_RESULT | jq -r '.data.games[0].id')
    
    echo "Используем ID для GraphQL запроса: $GRAPH_ID"
  fi

  # Формируем GraphQL запрос для получения полной информации о матче
  FULL_QUERY=$(cat <<EOF
{
  "query": "query GetFullGameDetails(\$id: ID!) { game(id: \$id) { id gameId title status startsAt sport { name } league { name } conditions { id conditionId status outcomes { id outcomeId title currentOdds } } } }",
  "variables": {
    "id": "$GRAPH_ID"
  }
}
EOF
)

  # Отладочная информация о запросе
  if [ "$QUIET_MODE" = "false" ]; then
    echo "Отправляем запрос для получения данных о матче..."
    echo "$FULL_QUERY" | jq .
  fi

  # Получаем полную информацию о матче из API
  FULL_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$FULL_QUERY" \
    $GRAPH_URL)
  
  # Проверяем, получен ли ответ от API
  if [ -z "$FULL_RESULT" ]; then
    echo "Ошибка: Не удалось получить ответ от API."
    exit 1
  fi
  
  # Отладочная информация о полученных данных
  if [ "$QUIET_MODE" = false ]; then
    echo "Получен ответ от API:"
    echo $FULL_RESULT | jq '.data.game | {id, gameId, title}'
  fi
  
  # Сохраняем полный результат в файл, если не тихий режим
  if [ "$QUIET_MODE" = false ]; then
    echo $FULL_RESULT | jq . > "$MATCH_DATA_FILE"
    echo "Полные данные о матче сохранены в файл $MATCH_DATA_FILE"
  fi
  
  # Проверяем наличие ошибок в ответе API
  if [[ $(echo $FULL_RESULT | jq 'has("errors")') == "true" ]]; then
    echo "Ошибка при выполнении запроса к API:"
    echo $(echo $FULL_RESULT | jq -r '.errors[0].message')
    echo "Полный ответ API:"
    echo $FULL_RESULT | jq .
    exit 1
  fi
  
  # Проверяем, содержит ли ответ данные о матче
  if [[ $(echo $FULL_RESULT | jq '.data.game') == "null" ]]; then
    echo "Ошибка: не удалось получить данные о матче с ID $GRAPH_ID."
    echo "Полный ответ API:"
    echo $FULL_RESULT | jq .
    exit 1
  fi
  
  # Используем полученные данные напрямую
  GAME_TITLE=$(echo $FULL_RESULT | jq -r '.data.game.title')
  GAME_STATUS=$(echo $FULL_RESULT | jq -r '.data.game.status')
  GAME_SPORT=$(echo $FULL_RESULT | jq -r '.data.game.sport.name')
  GAME_LEAGUE=$(echo $FULL_RESULT | jq -r '.data.game.league.name')
  STARTSATSTAMP=$(echo $FULL_RESULT | jq -r '.data.game.startsAt')
  GAME_START=$(date -d @$STARTSATSTAMP)
  
  # Создаем временный файл JSON с данными о матче для текущего анализа
  echo "{" > "$MATCH_DATA_FILE"
  echo "  \"gameId\": \"$(echo $FULL_RESULT | jq -r '.data.game.gameId')\"," >> "$MATCH_DATA_FILE"
  echo "  \"title\": \"$GAME_TITLE\"," >> "$MATCH_DATA_FILE"
  echo "  \"status\": \"$GAME_STATUS\"," >> "$MATCH_DATA_FILE"
  echo "  \"sport\": \"$GAME_SPORT\"," >> "$MATCH_DATA_FILE"
  echo "  \"league\": \"$GAME_LEAGUE\"," >> "$MATCH_DATA_FILE"
  echo "  \"startsAt\": \"$GAME_START\"," >> "$MATCH_DATA_FILE"
  echo "  \"conditions\": [" >> "$MATCH_DATA_FILE"
  
  # Обрабатываем условия и их исходы
  CONDITIONS_COUNT=0
  echo $FULL_RESULT | jq -c '.data.game.conditions[]' | while read -r condition; do
    CONDITION_ID=$(echo $condition | jq -r '.conditionId')
    
    # Определяем тип ставки и параметр на основе названий исходов и идентификаторов
    # Поскольку API не предоставляет информацию о типе ставки и параметре, используем 
    # данные из outcome_id для определения типа ставки
    
    OUTCOMES_IDS=$(echo $condition | jq -r '.outcomes[].outcomeId' | sort | tr '\n' ' ')
    
    # Логика определения типа ставки на основе ID исходов
    BET_TYPE=""
    PARAMETER=""
    
    if [[ $OUTCOMES_IDS == *"1 "* && $OUTCOMES_IDS == *"2 "* ]]; then
      # ID 1 и 2 обычно относятся к ставкам на Over/Under
      BET_TYPE="Total Goals"
      PARAMETER="2.5" # Предположение для Over/Under
    elif [[ $OUTCOMES_IDS == *"29 "* && $OUTCOMES_IDS == *"30 "* && $OUTCOMES_IDS == *"31 "* ]]; then
      # ID 29, 30, 31 обычно относятся к ставкам на 1X2
      BET_TYPE="1X2 (Основной исход)"
    elif [[ $OUTCOMES_IDS == *"181 "* && $OUTCOMES_IDS == *"182 "* ]]; then
      # ID 181, 182 могут относиться к специальным ставкам
      BET_TYPE="Special Bet"
    else
      # Неизвестный тип ставки, используем ID условия
      BET_TYPE="Condition #$CONDITION_ID"
    fi
    
    # Добавляем запятую, если это не первое условие
    if [ $CONDITIONS_COUNT -gt 0 ]; then
      echo "," >> "$MATCH_DATA_FILE"
    fi
    CONDITIONS_COUNT=$((CONDITIONS_COUNT + 1))
    
    # Добавляем условие в файл JSON
    echo "    {" >> "$MATCH_DATA_FILE"
    echo "      \"conditionId\": \"$CONDITION_ID\"," >> "$MATCH_DATA_FILE"
    echo "      \"betType\": \"$BET_TYPE\"," >> "$MATCH_DATA_FILE"
    
    if [ ! -z "$PARAMETER" ]; then
      echo "      \"parameter\": \"$PARAMETER\"," >> "$MATCH_DATA_FILE"
    fi
    
    echo "      \"outcomes\": [" >> "$MATCH_DATA_FILE"
    
    # Обрабатываем исходы
    OUTCOMES_COUNT=0
    echo $condition | jq -c '.outcomes[]' | while read -r outcome; do
      OUTCOME_ID=$(echo $outcome | jq -r '.outcomeId')
      OUTCOME_TITLE=$(echo $outcome | jq -r '.title')
      COEFFICIENT=$(echo $outcome | jq -r '.currentOdds')
      
      # Определяем название исхода на основе типа ставки и ID исхода
      if [ "$OUTCOME_TITLE" = "null" ]; then
        if [[ "$BET_TYPE" == "1X2 (Основной исход)" ]]; then
          if [ "$OUTCOME_ID" = "29" ]; then
            OUTCOME_TITLE="1"
          elif [ "$OUTCOME_ID" = "30" ]; then
            OUTCOME_TITLE="X"
          elif [ "$OUTCOME_ID" = "31" ]; then
            OUTCOME_TITLE="2"
          fi
        elif [[ "$BET_TYPE" == "Total Goals" ]]; then
          if [ "$OUTCOME_ID" = "1" ]; then
            OUTCOME_TITLE="Over ($PARAMETER)"
          elif [ "$OUTCOME_ID" = "2" ]; then
            OUTCOME_TITLE="Under ($PARAMETER)"
          fi
        fi
        
        # Если заголовок все еще не определен, используем ID исхода
        if [ "$OUTCOME_TITLE" = "null" ]; then
          OUTCOME_TITLE="Outcome #$OUTCOME_ID"
        fi
      fi
      
      # Определяем, является ли ставка рекомендованной
      RECOMMENDED="false"
      
      # Если это специально указанная ставка (в параметрах -c и -o)
      if [ "$CONDITION_ID" = "$CONDITION_ID_PARAM" ] && [ "$OUTCOME_ID" = "$OUTCOME_ID_PARAM" ]; then
        RECOMMENDED="true"
      fi
      
      # Добавляем запятую, если это не первый исход
      if [ $OUTCOMES_COUNT -gt 0 ]; then
        echo "," >> "$MATCH_DATA_FILE"
      fi
      OUTCOMES_COUNT=$((OUTCOMES_COUNT + 1))
      
      echo "        {" >> "$MATCH_DATA_FILE"
      echo "          \"title\": \"$OUTCOME_TITLE\"," >> "$MATCH_DATA_FILE"
      echo "          \"coefficient\": $COEFFICIENT," >> "$MATCH_DATA_FILE"
      echo "          \"outcomeId\": $OUTCOME_ID," >> "$MATCH_DATA_FILE"
      echo "          \"recommended\": $RECOMMENDED" >> "$MATCH_DATA_FILE"
      echo -n "        }" >> "$MATCH_DATA_FILE"
    done
    
    echo "" >> "$MATCH_DATA_FILE"
    echo "      ]" >> "$MATCH_DATA_FILE"
    echo -n "    }" >> "$MATCH_DATA_FILE"
  done
  
  echo "" >> "$MATCH_DATA_FILE"
  echo "  ]" >> "$MATCH_DATA_FILE"
  echo "}" >> "$MATCH_DATA_FILE"
  
  if [ "$QUIET_MODE" = false ]; then
    echo "Данные о матче сохранены в файл $MATCH_DATA_FILE для будущего использования."
    
    # Выводим основную информацию о матче
    echo -e "\n==== ИНФОРМАЦИЯ О МАТЧЕ ===="
    echo "Название: $GAME_TITLE"
    echo "ID: $GAME_ID"
    echo "GameID: $(echo $FULL_RESULT | jq -r '.data.game.gameId')"
    echo "Статус: $GAME_STATUS"
    echo "Спорт: $GAME_SPORT"
    echo "Лига: $GAME_LEAGUE"
    echo "Дата начала: $GAME_START"
  fi
  
  # Добавим вызов функции отладки перед highlight_recommended_bet
  if [ ! -z "$CONDITION_ID" ] && [ ! -z "$OUTCOME_ID" ]; then
    # Если запрошен только вывод кнопки
    if [ "$BUTTON_ONLY" = true ]; then
      show_recommended_button "$MATCH_DATA_FILE" "$CONDITION_ID" "$OUTCOME_ID"
    else
      debug_recommended_bet "$MATCH_DATA_FILE" "$CONDITION_ID" "$OUTCOME_ID"
      highlight_recommended_bet "$MATCH_DATA_FILE" "$OUTPUT_TEXT_FILE" "$CONDITION_ID" "$OUTCOME_ID"
      
      # Выводим результат в терминал
      cat "$OUTPUT_TEXT_FILE"
    fi
  else
    # Обычный вывод всех ставок
    format_ui_style_output "$MATCH_DATA_FILE" "$OUTPUT_TEXT_FILE"
    
    # Выводим результат в терминал
    cat "$OUTPUT_TEXT_FILE"
  fi
  
  exit 0
fi

# Выход с успешным статусом
exit 0 