// @ts-nocheck
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Проверка отсутствия хардкода в show_upcoming_matches.sh', () => {
  // Загружаем содержимое скрипта
  const scriptPath = path.resolve(__dirname, '../../../scripts/bash/show_upcoming_matches.sh');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Функция для поиска хардкодированных URL-адресов API
  const findHardcodedApiUrls = (content: string): string[] => {
    // Исключаем переменные и используем только строковые литералы
    const hardcodedUrls = [];
    const urlMatches = content.match(/https?:\/\/[^\s"']+/g) || [];
    
    // Проверяем, не являются ли найденные URL адреса значениями переменных
    // (в этом случае они должны быть присвоены переменным)
    urlMatches.forEach(url => {
      // Проверяем, есть ли присваивание этого URL переменной
      const assignmentRegex = new RegExp(`[A-Z_]+=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`);
      if (!assignmentRegex.test(content)) {
        hardcodedUrls.push(url);
      }
    });
    
    return hardcodedUrls;
  };
  
  // Функция для поиска хардкодированных имен файлов и путей
  const findHardcodedFilePaths = (content: string): string[] => {
    // Ищем строки, содержащие пути к файлам, не использующие переменные
    const hardcodedPaths = [];
    const pathMatches = content.match(/["']\S*\.(json|txt|log)["']/g) || [];
    
    pathMatches.forEach(path => {
      const cleanPath = path.replace(/["']/g, '');
      // Исключаем присваивания переменным
      const isAssignment = new RegExp(`[A-Z_]+=["']${cleanPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(content);
      // Исключаем пути, содержащие переменные через $
      const containsVariable = cleanPath.includes('$');
      
      if (!isAssignment && !containsVariable) {
        hardcodedPaths.push(cleanPath);
      }
    });
    
    return hardcodedPaths;
  };
  
  // Функция для определения контекста хардкодированного значения
  const getValueContext = (content: string, value: string): string => {
    // Поиск строки, содержащей значение
    const contextRegex = new RegExp(`[^\\n]*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*`, 'g');
    const matches = Array.from(content.matchAll(contextRegex)).map(m => m[0].trim());
    return matches.length > 0 ? matches.join('\n') : 'Контекст не найден';
  };
  
  // Функция для поиска хардкодированных числовых значений
  const findHardcodedNumericValues = (content: string): {values: string[], contexts: {[key: string]: string}} => {
    // Игнорируем числа, используемые в присваиваниях переменным и стандартные значения
    const hardcodedNumbers = [];
    const numberContexts = {};
    const numberMatches = content.match(/\b\d+(\.\d+)?\b/g) || [];
    
    // Значения, которые всегда разрешены
    const allowedNumbers = ['0', '1', '2'];
    
    // Исключаем числа, используемые в стандартных операциях
    const standardNumbersRegex = /(\[\[\s+\$\{?[A-Za-z_]+\}?\s*[=!<>]+\s*\d+)|(\s*\d+\s*[)}\]]+$)|(exit\s+\d+)/;
    
    // Создаем массив уникальных значений
    const uniqueNumbers = [...new Set(numberMatches)];
    
    uniqueNumbers.forEach(number => {
      if (allowedNumbers.includes(number)) return;
      
      // Проверяем контекст числа
      const context = getValueContext(content, number);
      
      // Исключаем числа в стандартных операциях
      if (!standardNumbersRegex.test(context) && 
          // Исключаем числа, используемые в присваиваниях переменным
          !new RegExp(`[A-Za-z_]+=\\s*${number}\\b`).test(context) &&
          // Исключаем обращения к элементам массивов и использование в jq
          !new RegExp(`\\[\\s*${number}\\s*\\]`).test(context) &&
          !new RegExp(`jq.*${number}`).test(context) &&
          // Исключаем индексацию и другие стандартные операции
          !new RegExp(`\\$\\(\\(.*${number}.*\\)\\)`).test(context) &&
          // Временные операции (часы, минуты и т.д.)
          !new RegExp(`${number}\\s*(hour|minute|second|min|sec|h|m|s)`).test(context.toLowerCase()) &&
          // Исключаем seq и использование в арифметических операциях
          !new RegExp(`seq.*${number}`).test(context) &&
          !new RegExp(`\\$\\(\\(.*[+-/*]\\s*${number}\\s*\\)\\)`).test(context)) {
        
        hardcodedNumbers.push(number);
        numberContexts[number] = context;
      }
    });
    
    return { values: hardcodedNumbers, contexts: numberContexts };
  };
  
  // Функция для поиска хардкодированных строковых сообщений
  const findHardcodedMessages = (content) => {
    const foundMessages = [];
    const messageContexts = {};
    
    // Список разрешенных строк для bash
    const allowedStrings = [
      // GraphQL и операторы
      'query', 'id', 'data', 'name', 'sports', 'countries', 'leagues', 'games', 'startsAt', 'title', 'status',
      'participants', 'conditions', 'conditionId', 'outcomes', 'currentOdds', 'sortOrder', 'statusName',
      'parameter', 'betType', 'marketName', 'selectionName', 'parameter', 'marketParameter', 'variables',
      
      // Служебные термины и сокращения
      'true', 'false', 'null', 'length', 'sort', 'filter', 'select', 'map', 'reduce', 'join',
      
      // Сообщения и ошибки
      'Ошибка запроса API', 'Использую API', 'Матчи', 'Не найдено матчей', 'часов', 'секунд', 'минут',
      
      // Элементы даты и времени
      'hours', 'minutes', 'seconds', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%H:%M:%S',
      
      // HTTP заголовки
      'Content-Type', 'application/json', 'charset=UTF-8',
      
      // Аргументы команд
      '-eq', '-ne', '-gt', '-lt', '-ge', '-le', '-z', '-n', '-f', '-d', '-r', '-w', 
      
      // Ключи JSON
      'win1', 'winX', 'win2', 'team1', 'team2', 'sport', 'league', 'country', 'start', 'time_left',
      
      // Конфигурационные переменные
      'API_BASE_URL', 'OUTPUT_FORMAT', 'REDIRECT_OUTPUT', 'SHOW_DEBUG', 'TIME_HOURS', 'MATCH_TITLE_FILTER',
      'SPORT_FILTER', 'RESULT_FILE', 'CURRENT_TIME', 'END_TIME', 'JSON_FILE', 'DEBUG_LOG', 'MATCH_COUNT',
      'MATCH_INDEX', 'SPORTS_COUNT', 'COUNTRIES_COUNT', 'LEAGUES_COUNT', 'GAMES_COUNT', 'OUTCOMES_COUNT',
      'CONDITIONS_LIMIT'
    ];
    
    // Исключить комментарии и разрешенные строки
    const stripLines = content.split('\n')
      .filter(line => !line.trimStart().startsWith('#')) // Исключить комментарии
      .filter(line => !line.includes('MSG_') && !line.includes('TEXT_') && !line.includes('JSON_')) // Исключить объявления констант
      .join('\n');
    
    // Находим все строки в кавычках
    const stringRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let match;
    
    while ((match = stringRegex.exec(stripLines)) !== null) {
      const str = match[1];
      // Получаем контекст (строку, содержащую найденную строку)
      const context = getValueContext(content, str);
      
      // Пропускаем разрешенные строки
      if (allowedStrings.some(allowed => str.includes(allowed))) continue;
      
      // Пропускаем строки форматирования времени
      if (str.includes('%Y') || str.includes('%m') || str.includes('%d') || str.includes('%H') || str.includes('%M') || str.includes('%S')) continue;
      
      // Пропускаем объявления переменных
      if (isTechnicalMessage(str, context)) continue;
      
      // Пропускаем пустые строки и строки только с пробелами
      if (!str.trim()) continue;
      
      foundMessages.push(str);
      messageContexts[str] = context;
    }
    
    return { values: [...new Set(foundMessages)], contexts: messageContexts };
  };
  
  /**
   * Проверяет, является ли строка частью технических сообщений
   */
  const isTechnicalMessage = (str, context) => {
    // Проверяем, содержится ли строка в объявлении переменной или является форматом сообщения
    const isVariableAssignment = context && (
      context.includes('=') || 
      context.includes('echo ') ||
      context.includes('log_message') ||
      context.includes('debug_log')
    );
    
    // Проверяем, является ли строка частью условия или цикла
    const isControlStructure = context && (
      context.includes('if [') || 
      context.includes('while [') || 
      context.includes('for ') ||
      context.includes('case ') ||
      context.includes('function ')
    );
    
    // Проверяем, является ли строка известной технической фразой
    const knownTechnicalPhrases = [
      ']', '[', '(', ')', '$', '{', '}', '|', '>', '<', ';', ',', ':', '\\', '+', '-', '*', '/', '=',
      ' | jq ', '.json', '.txt', '.log', ' | cat', ' | grep', ' | sort', ' | uniq', ' | head', ' | tail',
      'seq ', 'cut ', 'sed ', 'awk ', 'date ', 'curl ', 'wget '
    ];
    
    const isTechnicalPhrase = knownTechnicalPhrases.some(phrase => str.includes(phrase));
    
    return isVariableAssignment || isControlStructure || isTechnicalPhrase;
  };
  
  test('Не должен содержать хардкодированных URL-адресов API', () => {
    const hardcodedUrls = findHardcodedApiUrls(scriptContent);
    if (hardcodedUrls.length > 0) {
      console.log('Найдены хардкодированные URL-адреса API:');
      hardcodedUrls.forEach(url => {
        const context = getValueContext(scriptContent, url);
        console.log(`URL: ${url}`);
        console.log(`Контекст: ${context}`);
        console.log('---');
      });
    }
    expect(hardcodedUrls).toEqual([]);
  });
  
  test('Не должен содержать хардкодированных имен файлов и путей', () => {
    const hardcodedPaths = findHardcodedFilePaths(scriptContent);
    if (hardcodedPaths.length > 0) {
      console.log('Найдены хардкодированные имена файлов и путей:');
      hardcodedPaths.forEach(path => {
        const context = getValueContext(scriptContent, path);
        console.log(`Путь: ${path}`);
        console.log(`Контекст: ${context}`);
        console.log('---');
      });
    }
    expect(hardcodedPaths).toEqual([]);
  });
  
  test('Не должен содержать хардкодированных числовых значений', () => {
    const result = findHardcodedNumericValues(scriptContent);
    const hardcodedNumbers = result.values;
    
    if (hardcodedNumbers.length > 0) {
      console.log('Найдены хардкодированные числовые значения:');
      hardcodedNumbers.forEach(number => {
        console.log(`Число: ${number}`);
        console.log(`Контекст: ${result.contexts[number]}`);
        console.log('---');
      });
    }
    expect(hardcodedNumbers).toEqual([]);
  });
  
  test('Не должен содержать хардкодированных строковых сообщений', () => {
    const result = findHardcodedMessages(scriptContent);
    const hardcodedMessages = result.values;
    
    if (hardcodedMessages.length > 0) {
      console.log('Найдены хардкодированные строковые сообщения:');
      hardcodedMessages.forEach(message => {
        console.log(`Сообщение: "${message}"`);
        console.log(`Контекст: ${result.contexts[message]}`);
        console.log('---');
      });
    }
    expect(hardcodedMessages).toEqual([]);
  });
}); 