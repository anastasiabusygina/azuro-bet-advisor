#!/bin/bash

# Скрипт для запуска matches.ts с поддержкой ESM
echo "=== Запуск скрипта matches.ts ==="

# Параметры по умолчанию
FORMAT="text"
OUTPUT_FILE=""
TIME_WINDOW=86400
SPORT="Football"
MIN_ODDS=1.2

# Обработка параметров
while [[ $# -gt 0 ]]; do
  case $1 in
    --format=*)
      FORMAT="${1#*=}"
      shift
      ;;
    --output-file=*)
      OUTPUT_FILE="${1#*=}"
      shift
      ;;
    --time-window=*|--t=*)
      TIME_WINDOW="${1#*=}"
      shift
      ;;
    --sport=*)
      SPORT="${1#*=}"
      shift
      ;;
    --min-odds=*)
      MIN_ODDS="${1#*=}"
      shift
      ;;
    *)
      echo "Неизвестный параметр: $1"
      shift
      ;;
  esac
done

echo "Параметры запуска:"
echo "- Формат: $FORMAT"
echo "- Выходной файл: ${OUTPUT_FILE:-вывод в консоль}"
echo "- Временное окно: $TIME_WINDOW секунд"
echo "- Вид спорта: $SPORT"
echo "- Мин. коэффициент: $MIN_ODDS"

# Формируем команду запуска
CMD="NODE_OPTIONS=--experimental-specifier-resolution=node npx ts-node"
CMD+=" src/scripts/matches.ts"
CMD+=" --format $FORMAT"
[ -n "$OUTPUT_FILE" ] && CMD+=" --output-file $OUTPUT_FILE"
CMD+=" --time-window $TIME_WINDOW"
CMD+=" --sport $SPORT"
CMD+=" --min-odds $MIN_ODDS"

# Запускаем команду
echo -e "\nВыполнение команды: $CMD"
eval $CMD

# Если был указан выходной файл, проверяем его наличие
if [ -n "$OUTPUT_FILE" ]; then
  echo -e "\nПроверка созданного файла:"
  if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Файл $OUTPUT_FILE успешно создан"
    echo "   Размер: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo "   Дата создания: $(stat -c %y "$OUTPUT_FILE")"
  else
    OUTPUT_PATH="data/output/$OUTPUT_FILE"
    if [ -f "$OUTPUT_PATH" ]; then
      echo "✅ Файл $OUTPUT_PATH успешно создан"
      echo "   Размер: $(du -h "$OUTPUT_PATH" | cut -f1)"
      echo "   Дата создания: $(stat -c %y "$OUTPUT_PATH")"
    else
      echo "❌ Файл не найден ни в $OUTPUT_FILE, ни в $OUTPUT_PATH"
    fi
  fi
fi

echo -e "\n=== Завершено ==="
