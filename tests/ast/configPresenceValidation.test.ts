import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('Тест на наличие обязательной валидации переменных окружения', () => {
  const CONFIG_FILES = ['src/config/', 'scripts/node/', 'azuro-mapper.ts'];

  test('Проверка наличия валидации конфигов в разрешённых файлах', () => {
    const files = glob.sync('{src/config/,scripts/node/,azuro-mapper.ts}/**/*.{ts,js}', {
      ignore: ['archive/**']
    });
    let validationFound = false;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      console.log(`Проверяем файл: ${file}`);
      console.log(`Содержимое: ${content.substring(0, 300)}...`);
      if (
        /Joi\.object\s*\([\s\S]*?\)\s*\.validate\s*\(/.test(content) ||
        /Zod\.object\s*\([\s\S]*?\)\s*\.(parse|safeParse)\s*\(/.test(content) ||
        /z\.object\s*\([\s\S]*?\)\s*\.(parse|safeParse)\s*\(/.test(content) ||
        /Yup\.object\s*\([\s\S]*?\)\s*\.validate(Sync)?\s*\(/.test(content) ||
        /schema\s*\.\s*(parse|safeParse)\s*\(/.test(content)
      ) {
        console.log(`Найдена валидация в файле: ${file}`);
        validationFound = true;
        break;
      }
    }

    if (!validationFound) {
      throw new Error('Не найдена обязательная валидация конфигурации (Joi/Zod/Yup) в разрешённых файлах!');
    }
  });
});
