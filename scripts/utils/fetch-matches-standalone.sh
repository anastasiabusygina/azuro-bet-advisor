#!/bin/bash

# Скрипт для получения матчей из API (автономная версия)
echo "=== Загрузка матчей (автономная версия) ==="

# Проверка параметров
TIME_WINDOW=${1:-86400}  # По умолчанию 1 день (в секундах)
CHAIN=${2:-"polygon-mainnet"}  # По умолчанию mainnet
SPORT=${3:-"Football"}  # По умолчанию футбол

echo -e "\nПараметры запроса:"
echo "- Временное окно: $TIME_WINDOW секунд"
echo "- Сеть: $CHAIN"
echo "- Вид спорта: ${SPORT}"

# Установка переменных окружения и запуск скрипта
echo -e "\n[1] Загрузка матчей..."
echo "CHAIN=$CHAIN SPORT_NAME=\"$SPORT\" node --loader ts-node/esm scripts/ts/fetchAndFormatMatches.standalone.ts --t=$TIME_WINDOW"
CHAIN=$CHAIN SPORT_NAME="$SPORT" node --loader ts-node/esm scripts/ts/fetchAndFormatMatches.standalone.ts --t=$TIME_WINDOW | cat

# Проверяем, что матчи загрузились
echo -e "\n[2] Проверка загруженных матчей..."
ls -la scripts/data/matches/matches_*.md 2>/dev/null | tail -5

echo -e "\n=== Загрузка завершена ===" 