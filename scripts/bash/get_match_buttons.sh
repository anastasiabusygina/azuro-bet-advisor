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
QUIET_MODE=false
OUTPUT_FORMAT="text"
FILTER_BET_TYPE=""
CONDITION_ID=""
OUTCOME_ID=""
HIGHLIGHT_RECOMMENDED=false

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
  echo ""
  echo "Примеры:"
  echo "  $0 1006000000000026759546             # Получить данные для указанного матча"
  echo "  $0 --local-only 1006000000000026759546 # Использовать только локальные данные"
  echo "  $0 --list                              # Показать список доступных матчей"
  echo "  $0 --condition ID --outcome ID 1006000000000026759546 # Выделить конкретную ставку"
  echo ""
}

# Функция для чтения JSON-поля из файла
get_json_value() {
  local file=$1
  local field=$2
  cat "$file" | jq -r "$field"
}

# Функция для форматирования американского коэффициента
format_american_odds() {
  local decimal_odds=$1
  local american_odds
  
  # Более простая реализация без использования bc
  # Используем awk для математических вычислений
  if (( $(awk "BEGIN {print ($decimal_odds < 2.0)}") )); then
    american_odds=$(awk "BEGIN {printf \"%.0f\", -100 / ($decimal_odds - 1)}")
    echo "-$american_odds"
  else
    american_odds=$(awk "BEGIN {printf \"%.0f\", 100 * ($decimal_odds - 1)}")
    echo "+$american_odds"
  fi
}

# Функция для выделения рекомендованной ставки в выводе
highlight_recommended_bet() {
  local match_file=$1
  local condition_id=$2
  local outcome_id=$3
  local output_file=$4
  
  if [ -z "$condition_id" ] || [ -z "$outcome_id" ]; then
    # Если не указаны condition_id или outcome_id, просто используем обычную функцию вывода
    format_ui_style_output "$match_file" "$output_file"
    return
  fi
  
  local recommended_outcome=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .outcomes[] | select(.outcomeId==$outcome_id)")
  
  if [ -z "$recommended_outcome" ]; then
    echo "Предупреждение: Рекомендованная ставка (conditionId: $condition_id, outcomeId: $outcome_id) не найдена в текущих данных." | tee -a "$output_file"
    format_ui_style_output "$match_file" "$output_file"
    return
  fi
  
  local recommended_betType=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .betType")
  local recommended_title=$(echo "$recommended_outcome" | jq -r '.title')
  local recommended_parameter=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .parameter")
  
  echo -e "\n==== ИНФОРМАЦИЯ О МАТЧЕ ====" > "$output_file"
  echo "Название: $(get_json_value "$match_file" ".title")" >> "$output_file"
  echo "ID: $(get_json_value "$match_file" ".gameId")" >> "$output_file"
  echo "Статус: $(get_json_value "$match_file" ".status")" >> "$output_file"
  echo "Спорт: $(get_json_value "$match_file" ".sport")" >> "$output_file"
  echo "Лига: $(get_json_value "$match_file" ".league")" >> "$output_file"
  echo "Дата начала: $(get_json_value "$match_file" ".startsAt")" >> "$output_file"
  
  echo -e "\n==== РЕКОМЕНДОВАННАЯ СТАВКА ====" >> "$output_file"
  echo "Тип ставки: $recommended_betType" >> "$output_file"
  if [ "$recommended_parameter" != "null" ]; then
    echo "Параметр: $recommended_parameter" >> "$output_file"
  fi
  echo "Исход: $recommended_title" >> "$output_file"
  local coefficient=$(echo "$recommended_outcome" | jq -r '.coefficient')
  echo "Коэффициент: $coefficient ($(format_american_odds "$coefficient"))" >> "$output_file"
  echo "ID условия: $condition_id" >> "$output_file"
  echo "ID исхода: $outcome_id" >> "$output_file"
  
  # Затем добавляем стандартный вывод всех ставок
  echo -e "\n==== ВСЕ ДОСТУПНЫЕ СТАВКИ ====" >> "$output_file"
  
  # Теперь вызываем обычную функцию вывода, но дописываем в уже существующий файл
  local temp_file=$(mktemp)
  format_ui_style_output "$match_file" "$temp_file"
  # Пропускаем заголовок и информацию о матче (первые 7 строк)
  tail -n +8 "$temp_file" >> "$output_file"
  rm "$temp_file"
}

# Функция для вывода ставок в стиле, приближенном к UI на скриншоте
format_ui_style_output() {
  local match_file=$1
  local output_file=$2
  
  echo -e "\n==== ИНФОРМАЦИЯ О МАТЧЕ ====" > "$output_file"
  echo "Название: $(get_json_value "$match_file" ".title")" >> "$output_file"
  echo "ID: $(get_json_value "$match_file" ".gameId")" >> "$output_file"
  echo "Статус: $(get_json_value "$match_file" ".status")" >> "$output_file"
  echo "Спорт: $(get_json_value "$match_file" ".sport")" >> "$output_file"
  echo "Лига: $(get_json_value "$match_file" ".league")" >> "$output_file"
  echo "Дата начала: $(get_json_value "$match_file" ".startsAt")" >> "$output_file"
  
  # Ищем условия для ставки "Full Time Result & Total Goals"
  local ft_totals_conditions=$(get_json_value "$match_file" '.conditions[] | select(.betType=="Full Time Result & Total Goals")')
  
  if [ ! -z "$ft_totals_conditions" ]; then
    echo -e "\n==== Full Time Result & Total Goals ====" >> "$output_file"
    
    # Обрабатываем каждый параметр (1.5, 2.5, 3.5)
    for param in "1.5" "2.5" "3.5"; do
      # Получаем условия для данного параметра
      local condition_ids=$(get_json_value "$match_file" ".conditions[] | select(.betType==\"Full Time Result & Total Goals\" and .parameter==\"$param\") | .conditionId")
      
      if [ ! -z "$condition_ids" ]; then
        echo -e "\n--- Параметр: $param ---" >> "$output_file"
        
        # Для каждого condition_id
        for condition_id in $condition_ids; do
          # Получаем все исходы для данного условия
          local outcomes=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .outcomes")
          
          # Выбираем исходы по типам (1, X, 2) и направлениям (Over, Under)
          local outcomes_1_over=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("1 & Over"))' 2>/dev/null)
          local outcomes_1_under=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("1 & Under"))' 2>/dev/null)
          
          # Форматируем и выводим первую строку (1 & Over/Under)
          if [ ! -z "$outcomes_1_over" ] && [ ! -z "$outcomes_1_under" ]; then
            local title_over="1 & Over ($param)"
            local coef_over=$(echo "$outcomes_1_over" | jq -r '.coefficient')
            local us_odd_over=$(format_american_odds "$coef_over")
            
            local title_under="1 & Under ($param)"
            local coef_under=$(echo "$outcomes_1_under" | jq -r '.coefficient')
            local us_odd_under=$(format_american_odds "$coef_under")
            
            printf "%-30s %10s     %-30s %10s\n" "$title_over" "$us_odd_over" "$title_under" "$us_odd_under" >> "$output_file"
          fi
          
          # Аналогично для X & Over/Under
          local outcomes_x_over=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("X & Over"))' 2>/dev/null)
          local outcomes_x_under=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("X & Under"))' 2>/dev/null)
          
          if [ ! -z "$outcomes_x_over" ] && [ ! -z "$outcomes_x_under" ]; then
            local title_over="X & Over ($param)"
            local coef_over=$(echo "$outcomes_x_over" | jq -r '.coefficient')
            local us_odd_over=$(format_american_odds "$coef_over")
            
            local title_under="X & Under ($param)"
            local coef_under=$(echo "$outcomes_x_under" | jq -r '.coefficient')
            local us_odd_under=$(format_american_odds "$coef_under")
            
            printf "%-30s %10s     %-30s %10s\n" "$title_over" "$us_odd_over" "$title_under" "$us_odd_under" >> "$output_file"
          fi
          
          # Аналогично для 2 & Over/Under
          local outcomes_2_over=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("2 & Over"))' 2>/dev/null)
          local outcomes_2_under=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("2 & Under"))' 2>/dev/null)
          
          if [ ! -z "$outcomes_2_over" ] && [ ! -z "$outcomes_2_under" ]; then
            local title_over="2 & Over ($param)"
            local coef_over=$(echo "$outcomes_2_over" | jq -r '.coefficient')
            local us_odd_over=$(format_american_odds "$coef_over")
            
            local title_under="2 & Under ($param)"
            local coef_under=$(echo "$outcomes_2_under" | jq -r '.coefficient')
            local us_odd_under=$(format_american_odds "$coef_under")
            
            printf "%-30s %10s     %-30s %10s\n" "$title_over" "$us_odd_over" "$title_under" "$us_odd_under" >> "$output_file"
          fi
        done
      fi
    done
  fi
  
  # Ищем условия для ставки "Total Goals"
  local total_goals_conditions=$(get_json_value "$match_file" '.conditions[] | select(.betType=="Total Goals")')
  
  if [ ! -z "$total_goals_conditions" ]; then
    echo -e "\n==== Total Goals ====" >> "$output_file"
    
    # Обрабатываем каждый параметр (1.5, 2.5, 3.5)
    for param in "1.5" "2.5" "3.5"; do
      # Получаем условия для данного параметра
      local condition_ids=$(get_json_value "$match_file" ".conditions[] | select(.betType==\"Total Goals\" and .parameter==\"$param\") | .conditionId")
      
      if [ ! -z "$condition_ids" ]; then
        # Для каждого condition_id
        for condition_id in $condition_ids; do
          # Получаем все исходы для данного условия
          local outcomes=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .outcomes")
          
          # Выбираем исходы Over и Under
          local outcome_over=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("Over"))' 2>/dev/null)
          local outcome_under=$(echo "$outcomes" | jq -c '.[] | select(.title | contains("Under"))' 2>/dev/null)
          
          if [ ! -z "$outcome_over" ] && [ ! -z "$outcome_under" ]; then
            local title_over="Over ($param)"
            local coef_over=$(echo "$outcome_over" | jq -r '.coefficient')
            local us_odd_over=$(format_american_odds "$coef_over")
            
            local title_under="Under ($param)"
            local coef_under=$(echo "$outcome_under" | jq -r '.coefficient')
            local us_odd_under=$(format_american_odds "$coef_under")
            
            printf "%-30s %10s     %-30s %10s\n" "$title_over" "$us_odd_over" "$title_under" "$us_odd_under" >> "$output_file"
          fi
        done
      fi
    done
  fi
  
  # Ищем условия для ставки "1X2 (Основной исход)"
  local main_outcome_conditions=$(get_json_value "$match_file" '.conditions[] | select(.betType=="1X2 (Основной исход)")')
  
  if [ ! -z "$main_outcome_conditions" ]; then
    echo -e "\n==== 1X2 (Основной исход) ====" >> "$output_file"
    
    # Получаем условия
    local condition_ids=$(get_json_value "$match_file" ".conditions[] | select(.betType==\"1X2 (Основной исход)\") | .conditionId")
    
    for condition_id in $condition_ids; do
      # Получаем все исходы
      local outcomes=$(get_json_value "$match_file" ".conditions[] | select(.conditionId==\"$condition_id\") | .outcomes")
      
      # Выбираем исходы 1, X и 2
      local outcome_1=$(echo "$outcomes" | jq -c '.[] | select(.title=="1")' 2>/dev/null)
      local outcome_x=$(echo "$outcomes" | jq -c '.[] | select(.title=="X")' 2>/dev/null)
      local outcome_2=$(echo "$outcomes" | jq -c '.[] | select(.title=="2")' 2>/dev/null)
      
      # Выводим 1 и X
      if [ ! -z "$outcome_1" ] && [ ! -z "$outcome_x" ]; then
        local coef_1=$(echo "$outcome_1" | jq -r '.coefficient')
        local us_odd_1=$(format_american_odds "$coef_1")
        
        local coef_x=$(echo "$outcome_x" | jq -r '.coefficient')
        local us_odd_x=$(format_american_odds "$coef_x")
        
        printf "%-30s %10s     %-30s %10s\n" "1" "$us_odd_1" "X" "$us_odd_x" >> "$output_file"
      fi
      
      # Выводим 2 отдельно
      if [ ! -z "$outcome_2" ]; then
        local coef_2=$(echo "$outcome_2" | jq -r '.coefficient')
        local us_odd_2=$(format_american_odds "$coef_2")
        
        printf "%-30s %10s\n" "2" "$us_odd_2" >> "$output_file"
      fi
    done
  fi
  
  # Аналогично обрабатываем другие типы ставок
  # ...
}

# Обработка параметров командной строки
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--local-only)
      USE_LOCAL=true
      USE_API=false
      shift
      ;;
    -a|--api-only)
      USE_LOCAL=false
      USE_API=true
      shift
      ;;
    -u|--auto-update)
      AUTO_UPDATE=true
      shift
      ;;
    -q|--quiet)
      QUIET_MODE=true
      shift
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
      shift 2
      ;;
    -o|--outcome)
      OUTCOME_ID="$2"
      shift 2
      ;;
    -r|--recommended)
      HIGHLIGHT_RECOMMENDED=true
      shift
      ;;
    --list)
      LIST_MATCHES=true
      shift
      ;;
    *)
      # Если параметр не начинается с -, считаем его идентификатором игры
      if [[ $1 != -* ]]; then
        GAME_ID="$1"
      else
        echo "Неизвестный параметр: $1"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# Загружаем переменные окружения
source .env

# Используем URL API из переменных окружения
GRAPH_URL=$MAINNET_GRAPH_URL

# Функция для вывода списка доступных матчей
list_available_matches() {
  if [ -f "$MATCH_DATA_DIR/game_ids.json" ]; then
    echo "Доступные идентификаторы матчей:"
    cat "$MATCH_DATA_DIR/game_ids.json" | jq -r '.games[] | "ID: \(.id) - \(.name) (\(.description))"'
    echo ""
  else
    echo "Файл со списком матчей не найден: $MATCH_DATA_DIR/game_ids.json"
  fi
}

# Показываем список матчей, если запрошено
if [ "$LIST_MATCHES" = true ]; then
  list_available_matches
  exit 0
fi

# Проверяем наличие идентификатора игры
if [ -z "$GAME_ID" ]; then
  # Если идентификатор не передан, показываем список доступных матчей
  list_available_matches
  echo "Использование: $0 [ОПЦИИ] <game_id>"
  exit 1
fi

echo "Используем Azuro API: $GRAPH_URL"
echo "Ищем информацию о матче с ID: $GAME_ID"

# Проверяем, есть ли локальные данные для матча
MATCH_FILE="$MATCH_DATA_DIR/${GAME_ID}.json"
if [ -f "$MATCH_FILE" ]; then
  if [ "$USE_API" = false ] || [ "$QUIET_MODE" = true ] && [ "$AUTO_UPDATE" = false ]; then
    # Если указан флаг --local-only или тихий режим без автообновления
    USE_LOCAL=true
  elif [ "$QUIET_MODE" = false ]; then
    # Если не тихий режим, спрашиваем пользователя
    echo "Обнаружены локальные данные для матча с ID $GAME_ID."
    
    # Получаем время последнего обновления файла
    if [ "$(uname)" = "Darwin" ]; then
      # macOS
      LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$MATCH_FILE")
    else
      # Linux
      LAST_MODIFIED=$(stat -c "%y" "$MATCH_FILE" | cut -d. -f1)
    fi
    
    echo "Последнее обновление: $LAST_MODIFIED"
    
    if [ "$AUTO_UPDATE" = true ]; then
      # Проверяем, нужно ли обновление
      CURRENT_TIME=$(date +%s)
      
      if [ "$(uname)" = "Darwin" ]; then
        # macOS
        FILE_TIME=$(stat -f "%m" "$MATCH_FILE")
      else
        # Linux
        FILE_TIME=$(stat -c "%Y" "$MATCH_FILE")
      fi
      
      # Если файл старше 1 часа (3600 секунд), обновляем
      if [ $((CURRENT_TIME - FILE_TIME)) -gt 3600 ]; then
        echo "Данные устарели. Выполняется автоматическое обновление..."
        USE_LOCAL=false
      else
        echo "Данные актуальны. Используем локальные данные."
        USE_LOCAL=true
      fi
    else
      echo "Хотите использовать локальные данные? (y/n)"
      read -r USE_LOCAL_DATA
      
      if [[ "$USE_LOCAL_DATA" =~ ^[Yy]$ ]]; then
        USE_LOCAL=true
      else
        USE_LOCAL=false
      fi
    fi
  fi
else
  # Если локальных данных нет и API недоступен, выходим с ошибкой
  if [ "$USE_API" = false ]; then
    echo "Ошибка: локальные данные не найдены, а режим --local-only активирован."
    exit 1
  fi
  
  # Если локальных данных нет, но есть пример, создаем копию
  if [ -f "$MATCH_DATA_DIR/sample_match.json" ]; then
    echo "Локальных данных для матча нет, но есть пример. Создаем копию для матча."
    cp "$MATCH_DATA_DIR/sample_match.json" "$MATCH_FILE"
    
    # Обновляем ID в копии файла
    sed -i "s/1006000000000026759546/$GAME_ID/g" "$MATCH_FILE"
    
    if [ "$QUIET_MODE" = false ]; then
      echo "Создан файл с примером данных для матча. Хотите продолжить поиск через API? (y/n)"
      read -r CONTINUE_API_SEARCH
      
      if [[ "$CONTINUE_API_SEARCH" =~ ^[Nn]$ ]]; then
        USE_LOCAL=true
        USE_API=false
      fi
    fi
  fi
fi

# Улучшенный GraphQL запрос для получения детальной информации о матче и ставках с учетом параметров
DETAILED_QUERY='{
  "query": "query GetFullGameDetails($id: ID!) { 
    game(id: $id) { 
      id 
      gameId 
      title 
      startsAt 
      status 
      sport { name } 
      league { name } 
      country { name } 
      conditions { 
        id 
        conditionId 
        status 
        marketName
        parameterX
        isExpressForbidden
        core {
          target
          scopeId
        }
        outcomes { 
          id 
          outcomeId 
          selectionName
          title
          currentOdds
        } 
      } 
    } 
  }",
  "variables": {
    "id": "'$GAME_ID'"
  }
}'

# Если не используем локальные данные, выполняем запрос к API
if [ "$USE_LOCAL" = false ] && [ "$USE_API" = true ]; then
    # Запрос для поиска матча по gameId в формате, соответствующем GraphQL
    echo "Поиск матча по gameId..."
    SEARCH_QUERY='{
      "query": "query GetGamesByGameId($gameId: String!) { games(where: {gameId: $gameId}) { id gameId title startsAt status sport { name } } }",
      "variables": {
        "gameId": "'$GAME_ID'"
      }
    }'

    if [ "$QUIET_MODE" = false ]; then
      echo "Отправляем запрос к API..."
    fi

    SEARCH_RESULT=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "$SEARCH_QUERY" \
      $GRAPH_URL)

    # Проверяем, получен ли ответ от API
    if [ -z "$SEARCH_RESULT" ]; then
      echo "Ошибка: Не удалось получить ответ от API."
      exit 1
    fi

    # Сохраняем результат поиска в файл, если не тихий режим
    if [ "$QUIET_MODE" = false ]; then
      echo $SEARCH_RESULT | jq . > "$SEARCH_RESULT_FILE"
      echo "Результаты поиска сохранены в файл $SEARCH_RESULT_FILE"
    fi

    # Проверяем, есть ли ошибки в ответе
    if [[ $(echo $SEARCH_RESULT | jq 'has("errors")') == "true" ]]; then
      if [ "$QUIET_MODE" = false ]; then
        echo "Ошибка при выполнении запроса поиска по gameId:"
        echo $(echo $SEARCH_RESULT | jq -r '.errors[0].message')
      fi
      exit 1
    fi

    # Проверяем количество найденных игр
    GAME_COUNT=$(echo $SEARCH_RESULT | jq '.data.games | length')
    
    if [ "$GAME_COUNT" -eq "0" ]; then
      if [ "$QUIET_MODE" = false ]; then
        echo "Матч с gameId $GAME_ID не найден."
      fi
      
      if [ -f "$MATCH_FILE" ]; then
        echo "Переходим к использованию локальных данных."
        USE_LOCAL=true
      else
        echo "Ошибка: матч не найден и локальные данные отсутствуют."
        exit 1
      fi
    else
      if [ "$QUIET_MODE" = false ]; then
        echo "Матч найден по gameId."
      fi
      
      USE_LOCAL=false
      GAME_ID=$(echo $SEARCH_RESULT | jq -r '.data.games[0].id')
      
      if [ "$QUIET_MODE" = false ]; then
        echo "Используем ID: $GAME_ID"
      fi
    fi
fi

# Если используем локальные данные
if [ "$USE_LOCAL" = true ]; then
  if [ "$QUIET_MODE" = false ]; then
    echo "Используем данные из локального файла для анализа..."
  fi
  
  if [ ! -f "$MATCH_FILE" ]; then
    echo "Ошибка: файл с данными о матче не найден: $MATCH_FILE"
    exit 1
  fi
  
  # Извлекаем информацию о матче из файла
  TITLE=$(get_json_value "$MATCH_FILE" ".title")
  STATUS=$(get_json_value "$MATCH_FILE" ".status")
  SPORT=$(get_json_value "$MATCH_FILE" ".sport")
  LEAGUE=$(get_json_value "$MATCH_FILE" ".league")
  STARTS_AT=$(get_json_value "$MATCH_FILE" ".startsAt")
  
  # Если формат вывода JSON, формируем результат в JSON
  if [ "$OUTPUT_FORMAT" = "json" ]; then
    # Создаем файл JSON с результатами
    echo "{" > "$OUTPUT_JSON_FILE"
    echo "  \"match\": {" >> "$OUTPUT_JSON_FILE"
    echo "    \"title\": \"$TITLE\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"id\": \"$GAME_ID\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"gameId\": \"$GAME_ID\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"status\": \"$STATUS\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"sport\": \"$SPORT\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"league\": \"$LEAGUE\"," >> "$OUTPUT_JSON_FILE"
    echo "    \"startsAt\": \"$STARTS_AT\"" >> "$OUTPUT_JSON_FILE"
    echo "  }," >> "$OUTPUT_JSON_FILE"
    
    # Если указаны condition_id и outcome_id, добавляем информацию о рекомендованной ставке
    if [ -n "$CONDITION_ID" ] && [ -n "$OUTCOME_ID" ]; then
      recommended_outcome=$(get_json_value "$MATCH_FILE" ".conditions[] | select(.conditionId==\"$CONDITION_ID\") | .outcomes[] | select(.outcomeId==$OUTCOME_ID)")
      
      if [ ! -z "$recommended_outcome" ]; then
        recommended_betType=$(get_json_value "$MATCH_FILE" ".conditions[] | select(.conditionId==\"$CONDITION_ID\") | .betType")
        recommended_title=$(echo "$recommended_outcome" | jq -r '.title')
        recommended_parameter=$(get_json_value "$MATCH_FILE" ".conditions[] | select(.conditionId==\"$CONDITION_ID\") | .parameter")
        coefficient=$(echo "$recommended_outcome" | jq -r '.coefficient')
        us_odd=$(format_american_odds "$coefficient")
        
        echo "  \"recommendedBet\": {" >> "$OUTPUT_JSON_FILE"
        echo "    \"conditionId\": \"$CONDITION_ID\"," >> "$OUTPUT_JSON_FILE"
        echo "    \"outcomeId\": $OUTCOME_ID," >> "$OUTPUT_JSON_FILE"
        echo "    \"betType\": \"$recommended_betType\"," >> "$OUTPUT_JSON_FILE"
        if [ "$recommended_parameter" != "null" ]; then
          echo "    \"parameter\": \"$recommended_parameter\"," >> "$OUTPUT_JSON_FILE"
        fi
        echo "    \"title\": \"$recommended_title\"," >> "$OUTPUT_JSON_FILE"
        echo "    \"coefficient\": $coefficient," >> "$OUTPUT_JSON_FILE"
        echo "    \"americanOdds\": \"$us_odd\"" >> "$OUTPUT_JSON_FILE"
        echo "  }," >> "$OUTPUT_JSON_FILE"
      fi
    fi
    
    echo "  \"buttons\": {" >> "$OUTPUT_JSON_FILE"
    
    # Получаем количество условий
    CONDITIONS_COUNT=$(get_json_value "$MATCH_FILE" ".conditions | length")
    
    # Обрабатываем каждое условие и его исходы
    for ((i=0; i<$CONDITIONS_COUNT; i++)); do
      CONDITION_ID=$(get_json_value "$MATCH_FILE" ".conditions[$i].conditionId")
      BET_TYPE=$(get_json_value "$MATCH_FILE" ".conditions[$i].betType")
      PARAMETER=$(get_json_value "$MATCH_FILE" ".conditions[$i].parameter")
      
      # Добавляем групповой ключ для типа ставки
      BET_TYPE_KEY=$(echo "$BET_TYPE" | tr ' ' '_' | tr '&' 'n')
      
      # Если параметр существует, используем его в ключе
      if [ "$PARAMETER" != "null" ]; then
        BET_TYPE_KEY="${BET_TYPE_KEY}_${PARAMETER}"
      fi
      
      # Пропускаем, если задан фильтр по типу ставки и текущая ставка не соответствует
      if [ ! -z "$FILTER_BET_TYPE" ] && [[ ! "$BET_TYPE" =~ $FILTER_BET_TYPE ]]; then
        continue
      fi
      
      # Добавляем запятую, если это не первый тип ставки
      if [ $i -gt 0 ]; then
        echo "," >> "$OUTPUT_JSON_FILE"
      fi
      
      echo "    \"$BET_TYPE_KEY\": {" >> "$OUTPUT_JSON_FILE"
      echo "      \"name\": \"$BET_TYPE\"," >> "$OUTPUT_JSON_FILE"
      
      if [ "$PARAMETER" != "null" ]; then
        echo "      \"parameter\": \"$PARAMETER\"," >> "$OUTPUT_JSON_FILE"
      fi
      
      echo "      \"conditionId\": \"$CONDITION_ID\"," >> "$OUTPUT_JSON_FILE"
      echo "      \"outcomes\": [" >> "$OUTPUT_JSON_FILE"
      
      # Получаем количество исходов для текущего условия
      OUTCOMES_COUNT=$(get_json_value "$MATCH_FILE" ".conditions[$i].outcomes | length")
      
      # Обрабатываем каждый исход
      for ((j=0; j<$OUTCOMES_COUNT; j++)); do
        OUTCOME_TITLE=$(get_json_value "$MATCH_FILE" ".conditions[$i].outcomes[$j].title")
        COEFFICIENT=$(get_json_value "$MATCH_FILE" ".conditions[$i].outcomes[$j].coefficient")
        OUTCOME_ID=$(get_json_value "$MATCH_FILE" ".conditions[$i].outcomes[$j].outcomeId")
        RECOMMENDED=$(get_json_value "$MATCH_FILE" ".conditions[$i].outcomes[$j].recommended")
        
        # Вычисляем американский формат коэффициента
        US_ODD=$(format_american_odds "$COEFFICIENT")
        
        # Добавляем запятую, если это не первый исход
        if [ $j -gt 0 ]; then
          echo "," >> "$OUTPUT_JSON_FILE"
        fi
        
        echo "        {" >> "$OUTPUT_JSON_FILE"
        echo "          \"title\": \"$OUTCOME_TITLE\"," >> "$OUTPUT_JSON_FILE"
        echo "          \"coefficient\": $COEFFICIENT," >> "$OUTPUT_JSON_FILE"
        echo "          \"americanOdds\": \"$US_ODD\"," >> "$OUTPUT_JSON_FILE"
        echo "          \"outcomeId\": $OUTCOME_ID," >> "$OUTPUT_JSON_FILE"
        echo "          \"recommended\": $RECOMMENDED" >> "$OUTPUT_JSON_FILE"
        echo -n "        }" >> "$OUTPUT_JSON_FILE"
      done
      
      echo "" >> "$OUTPUT_JSON_FILE"
      echo "      ]" >> "$OUTPUT_JSON_FILE"
      echo -n "    }" >> "$OUTPUT_JSON_FILE"
    done
    
    echo "" >> "$OUTPUT_JSON_FILE"
    echo "  }" >> "$OUTPUT_JSON_FILE"
    echo "}" >> "$OUTPUT_JSON_FILE"
    
    # Выводим результат в стандартный вывод
    if [ "$QUIET_MODE" = false ]; then
      echo "Результаты сохранены в файл $OUTPUT_JSON_FILE"
      cat "$OUTPUT_JSON_FILE" | jq .
    else
      cat "$OUTPUT_JSON_FILE"
    fi
  else
    # Формируем вывод в текстовом формате
    if [ -n "$CONDITION_ID" ] && [ -n "$OUTCOME_ID" ]; then
      # Если указаны ID условия и исхода, используем функцию выделения рекомендованной ставки
      highlight_recommended_bet "$MATCH_FILE" "$CONDITION_ID" "$OUTCOME_ID" "$OUTPUT_TEXT_FILE"
    else
      # Иначе используем обычную функцию вывода
      format_ui_style_output "$MATCH_FILE" "$OUTPUT_TEXT_FILE"
    fi
    
    if [ "$QUIET_MODE" = false ]; then
      echo -e "\nИнформация о кнопках сохранена в файл $OUTPUT_TEXT_FILE"
      echo "Посмотреть результаты можно командой: cat $OUTPUT_TEXT_FILE"
      
      # Если не тихий режим, выводим результаты на экран
      cat "$OUTPUT_TEXT_FILE"
    fi
  fi
else
  # Получаем полную информацию о матче из API
  if [ "$QUIET_MODE" = false ]; then
    echo -e "\nПолучаем полную информацию о матче и всех доступных ставках..."
  fi
  
  FULL_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$DETAILED_QUERY" \
    $GRAPH_URL)
  
  # Проверяем, получен ли ответ от API
  if [ -z "$FULL_RESULT" ]; then
    echo "Ошибка: Не удалось получить ответ от API."
    if [ -f "$MATCH_FILE" ]; then
      echo "Переходим к использованию локальных данных."
      USE_LOCAL=true
    else
      exit 1
    fi
  fi
  
  # Сохраняем полный результат в файл, если не тихий режим
  if [ "$QUIET_MODE" = false ]; then
    echo $FULL_RESULT | jq . > "$MATCH_DATA_FILE"
    echo "Полные данные о матче сохранены в файл $MATCH_DATA_FILE"
  fi
  
  # Проверяем успешность запроса
  if [[ $(echo $FULL_RESULT | jq 'has("errors")') == "true" ]]; then
    echo "Ошибка при выполнении запроса к API:"
    echo $(echo $FULL_RESULT | jq -r '.errors[0].message')
    
    if [ -f "$MATCH_FILE" ]; then
      echo "Переходим к использованию локальных данных."
      USE_LOCAL=true
    else
      exit 1
    fi
  elif [[ $(echo $FULL_RESULT | jq -r '.data.game') == "null" ]]; then
    echo "Матч с ID $GAME_ID не найден."
    
    if [ -f "$MATCH_FILE" ]; then
      echo "Переходим к использованию локальных данных."
      USE_LOCAL=true
    else
      echo "Ошибка: матч не найден и локальные данные отсутствуют."
      exit 1
    fi
  fi
  
  # Сохраняем данные в локальный файл JSON для будущего использования
  GAME_TITLE=$(echo $FULL_RESULT | jq -r '.data.game.title')
  GAME_STATUS=$(echo $FULL_RESULT | jq -r '.data.game.status')
  GAME_SPORT=$(echo $FULL_RESULT | jq -r '.data.game.sport.name')
  GAME_LEAGUE=$(echo $FULL_RESULT | jq -r '.data.game.league.name')
  GAME_COUNTRY=$(echo $FULL_RESULT | jq -r '.data.game.country.name')
  STARTSATSTAMP=$(echo $FULL_RESULT | jq -r '.data.game.startsAt')
  GAME_START=$(date -d @$STARTSATSTAMP)
  
  # Создаем структуру JSON файла для сохранения данных матча
  echo "{" > "$MATCH_FILE"
  echo "  \"gameId\": \"$(echo $FULL_RESULT | jq -r '.data.game.gameId')\"," >> "$MATCH_FILE"
  echo "  \"title\": \"$GAME_TITLE\"," >> "$MATCH_FILE"
  echo "  \"status\": \"$GAME_STATUS\"," >> "$MATCH_FILE"
  echo "  \"sport\": \"$GAME_SPORT\"," >> "$MATCH_FILE"
  echo "  \"league\": \"$GAME_LEAGUE\"," >> "$MATCH_FILE"
  echo "  \"country\": \"$GAME_COUNTRY\"," >> "$MATCH_FILE"
  echo "  \"startsAt\": \"$GAME_START\"," >> "$MATCH_FILE"
  echo "  \"lastUpdated\": \"$(date)\"," >> "$MATCH_FILE"
  echo "  \"conditions\": [" >> "$MATCH_FILE"
  
  # Добавляем матч в список матчей, если его там еще нет
  if [ -f "$MATCH_DATA_DIR/game_ids.json" ]; then
    FOUND_IN_LIST=$(cat "$MATCH_DATA_DIR/game_ids.json" | jq -r ".games[] | select(.id == \"$GAME_ID\") | .id")
    
    if [ -z "$FOUND_IN_LIST" ]; then
      # Добавляем новый матч в список
      jq ".games += [{\"id\": \"$GAME_ID\", \"name\": \"$GAME_TITLE\", \"description\": \"$GAME_LEAGUE\"}]" "$MATCH_DATA_DIR/game_ids.json" > "$MATCH_DATA_DIR/game_ids.json.tmp"
      mv "$MATCH_DATA_DIR/game_ids.json.tmp" "$MATCH_DATA_DIR/game_ids.json"
    fi
  else
    # Создаем новый файл со списком матчей
    mkdir -p "$MATCH_DATA_DIR"
    echo "{\"games\": [{\"id\": \"$GAME_ID\", \"name\": \"$GAME_TITLE\", \"description\": \"$GAME_LEAGUE\"}]}" > "$MATCH_DATA_DIR/game_ids.json"
  fi
  
  # Обрабатываем условия и их исходы
  CONDITIONS_COUNT=0
  echo $FULL_RESULT | jq -c '.data.game.conditions[]' | while read -r condition; do
    CONDITION_ID=$(echo $condition | jq -r '.conditionId')
    
    # Определяем тип ставки и параметр на основе названий исходов и данных core
    CORE_TARGET=$(echo $condition | jq -r '.core.target // "null"')
    CORE_SCOPE=$(echo $condition | jq -r '.core.scopeId // "null"')
    MARKET_NAME=$(echo $condition | jq -r '.marketName // "null"')
    PARAMETER_X=$(echo $condition | jq -r '.parameterX // "null"')
    
    # Собираем все названия исходов для определения типа ставки
    OUTCOMES_TITLES=$(echo $condition | jq -r '.outcomes[].selectionName // .outcomes[].title' | sort | tr '\n' ' ')
    
    # Улучшенная логика определения типа ставки и параметра
    BET_TYPE=""
    PARAMETER=""
    
    # Сначала проверяем marketName из API
    if [ "$MARKET_NAME" != "null" ]; then
      case "$MARKET_NAME" in
        "1x2")
          BET_TYPE="1X2 (Основной исход)"
          ;;
        "totals")
          BET_TYPE="Total Goals"
          PARAMETER="$PARAMETER_X"
          ;;
        "correct_score")
          BET_TYPE="Correct Score"
          ;;
        "both_teams_to_score")
          BET_TYPE="Both Teams To Score"
          ;;
        "double_chance")
          BET_TYPE="Double Chance"
          ;;
        "handicap")
          BET_TYPE="Handicap"
          PARAMETER="$PARAMETER_X"
          ;;
        "team_totals")
          if [[ "$CORE_SCOPE" == *"team1"* ]]; then
            BET_TYPE="Home Team Total Goals"
          elif [[ "$CORE_SCOPE" == *"team2"* ]]; then
            BET_TYPE="Away Team Total Goals"
          else
            BET_TYPE="Team Total Goals"
          fi
          PARAMETER="$PARAMETER_X"
          ;;
        "1x2_totals")
          BET_TYPE="Full Time Result & Total Goals"
          PARAMETER="$PARAMETER_X"
          ;;
        *)
          # Если marketName не распознан, используем определение по исходам
          if [[ $OUTCOMES_TITLES == *"1 "* && $OUTCOMES_TITLES == *"X "* && $OUTCOMES_TITLES == *"2 "* ]]; then
            BET_TYPE="1X2 (Основной исход)"
          elif [[ $OUTCOMES_TITLES == *"1 & Over"* || $OUTCOMES_TITLES == *"1 & Under"* ]]; then
            BET_TYPE="Full Time Result & Total Goals"
            PARAMETER="$CORE_TARGET"
          fi
          ;;
      esac
    else
      # Резервное определение по названиям исходов, если marketName не доступен
      if [[ $OUTCOMES_TITLES == *"1 "* && $OUTCOMES_TITLES == *"X "* && $OUTCOMES_TITLES == *"2 "* ]]; then
        BET_TYPE="1X2 (Основной исход)"
      elif [[ $OUTCOMES_TITLES == *"1 & Over"* || $OUTCOMES_TITLES == *"1 & Under"* ]]; then
        BET_TYPE="Full Time Result & Total Goals"
        # Используем данные core.target если доступны, иначе определяем по названиям
        if [ "$CORE_TARGET" != "null" ]; then
          PARAMETER="$CORE_TARGET"
        elif [[ $OUTCOMES_TITLES == *"(1.5)"* ]]; then
          PARAMETER="1.5"
        elif [[ $OUTCOMES_TITLES == *"(2.5)"* ]]; then
          PARAMETER="2.5"
        elif [[ $OUTCOMES_TITLES == *"(3.5)"* ]]; then
          PARAMETER="3.5"
        fi
      elif [[ $OUTCOMES_TITLES == *"Yes "* && $OUTCOMES_TITLES == *"No "* ]]; then
        BET_TYPE="Both Teams To Score"
      elif [[ $OUTCOMES_TITLES == *"Over "* && $OUTCOMES_TITLES == *"Under "* ]]; then
        BET_TYPE="Total Goals"
        # Используем данные core.target если доступны, иначе определяем по названиям
        if [ "$CORE_TARGET" != "null" ]; then
          PARAMETER="$CORE_TARGET"
        elif [[ $OUTCOMES_TITLES == *"(1.5)"* ]]; then
          PARAMETER="1.5"
        elif [[ $OUTCOMES_TITLES == *"(2.5)"* ]]; then
          PARAMETER="2.5"
        elif [[ $OUTCOMES_TITLES == *"(3.5)"* ]]; then
          PARAMETER="3.5"
        fi
      fi
    fi
    
    # Пропускаем, если задан фильтр по типу ставки и текущая ставка не соответствует
    if [ ! -z "$FILTER_BET_TYPE" ] && [[ ! "$BET_TYPE" =~ $FILTER_BET_TYPE ]]; then
      continue
    fi
    
    # Добавляем запятую, если это не первое условие
    if [ $CONDITIONS_COUNT -gt 0 ]; then
      echo "," >> "$MATCH_FILE"
    fi
    CONDITIONS_COUNT=$((CONDITIONS_COUNT + 1))
    
    # Добавляем условие в файл JSON
    echo "    {" >> "$MATCH_FILE"
    echo "      \"conditionId\": \"$CONDITION_ID\"," >> "$MATCH_FILE"
    echo "      \"betType\": \"$BET_TYPE\"," >> "$MATCH_FILE"
    
    if [ ! -z "$PARAMETER" ]; then
      echo "      \"parameter\": \"$PARAMETER\"," >> "$MATCH_FILE"
    fi
    
    echo "      \"outcomes\": [" >> "$MATCH_FILE"
    
    # Обрабатываем исходы
    OUTCOMES_COUNT=0
    echo $condition | jq -c '.outcomes[]' | while read -r outcome; do
      OUTCOME_ID=$(echo $outcome | jq -r '.outcomeId')
      OUTCOME_TITLE=$(echo $outcome | jq -r '.title')
      COEFFICIENT=$(echo $outcome | jq -r '.currentOdds')
      
      # Определяем, является ли ставка рекомендованной
      # В этой версии добавим более сложную логику для определения рекомендованных ставок
      RECOMMENDED="false"
      
      # Пример логики для определения рекомендованных ставок на основе коэффициентов
      # Можно улучшить, добавив больше логики или забирая рекомендацию из API если доступно
      if [[ "$BET_TYPE" == "Full Time Result & Total Goals" && "$PARAMETER" == "1.5" && "$OUTCOME_TITLE" == "1 & Over (1.5)" ]]; then
        RECOMMENDED="true"
      elif [[ "$BET_TYPE" == "1X2 (Основной исход)" && "$OUTCOME_TITLE" == "1" && $(echo "$COEFFICIENT < 1.3" | bc -l) -eq 1 ]]; then
        # Если основной исход на победу первой команды с очень низким коэффициентом
        RECOMMENDED="true"
      fi
      
      # Добавляем запятую, если это не первый исход
      if [ $OUTCOMES_COUNT -gt 0 ]; then
        echo "," >> "$MATCH_FILE"
      fi
      OUTCOMES_COUNT=$((OUTCOMES_COUNT + 1))
      
      echo "        {" >> "$MATCH_FILE"
      echo "          \"title\": \"$OUTCOME_TITLE\"," >> "$MATCH_FILE"
      echo "          \"coefficient\": $COEFFICIENT," >> "$MATCH_FILE"
      echo "          \"outcomeId\": $OUTCOME_ID," >> "$MATCH_FILE"
      echo "          \"recommended\": $RECOMMENDED" >> "$MATCH_FILE"
      echo -n "        }" >> "$MATCH_FILE"
    done
    
    echo "" >> "$MATCH_FILE"
    echo "      ]" >> "$MATCH_FILE"
    echo -n "    }" >> "$MATCH_FILE"
  done
  
  echo "" >> "$MATCH_FILE"
  echo "  ]" >> "$MATCH_FILE"
  echo "}" >> "$MATCH_FILE"
  
  if [ "$QUIET_MODE" = false ]; then
    echo "Данные о матче сохранены в файл $MATCH_FILE для будущего использования."
    
    # Выводим основную информацию о матче
    echo -e "\n==== ИНФОРМАЦИЯ О МАТЧЕ ===="
    echo "Название: $GAME_TITLE"
    echo "ID: $GAME_ID"
    echo "GameID: $(echo $FULL_RESULT | jq -r '.data.game.gameId')"
    echo "Статус: $GAME_STATUS"
    echo "Спорт: $GAME_SPORT"
    echo "Лига: $GAME_LEAGUE"
    echo "Страна: $GAME_COUNTRY"
    echo "Дата начала: $GAME_START"
  fi
  
  # Запускаем скрипт заново в режиме локальных данных, чтобы обработать сохраненные данные
  if [ "$QUIET_MODE" = false ]; then
    echo -e "\nПереключаемся на использование сохраненных локальных данных..."
  fi
  
  if [ "$QUIET_MODE" = true ]; then
    $0 --local-only --quiet "$GAME_ID"
  else
    $0 --local-only "$GAME_ID"
  fi
  exit $?
fi

# Выход с успешным статусом
exit 0 