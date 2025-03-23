import { glob } from 'glob';
import { readFileSync } from 'fs';
import { 
  CONFIG_FILES, 
  CONFIG_FILES_PATTERN, 
  IGNORE_PATTERNS, 
  VALIDATION_PATTERNS,
  VALIDATION_ERROR_MESSAGE 
} from '../configs/configPresenceValidation.config';

describe('Тест на наличие обязательной валидации переменных окружения', () => {
  test('Проверка наличия валидации конфигов в разрешённых файлах', () => {
    const files = glob.sync(CONFIG_FILES_PATTERN, {
      ignore: IGNORE_PATTERNS
    });
    let validationFound = false;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      console.log(`Проверяем файл: ${file}`);
      console.log(`Содержимое: ${content.substring(0, 300)}...`);
      
      // Проверяем наличие валидации с помощью регулярных выражений из конфигурации
      if (VALIDATION_PATTERNS.some(pattern => pattern.test(content))) {
        console.log(`Найдена валидация в файле: ${file}`);
        validationFound = true;
        break;
      }
    }

    if (!validationFound) {
      throw new Error(VALIDATION_ERROR_MESSAGE);
    }
  });
});
