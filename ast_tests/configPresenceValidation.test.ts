import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('Тест на наличие обязательной валидации переменных окружения', () => {
  const CONFIG_FILES = ['config/', 'scripts/ts/', 'azuro-mapper.ts'];

  test('Проверка наличия валидации конфигов в разрешённых файлах', () => {
    const files = glob.sync('{config/,scripts/ts/,azuro-mapper.ts}/**/*.{ts,js}');

    let validationFound = false;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');

      if (
        /Joi\.object\(.+\)\.validate\(/.test(content) ||
        /Zod\.object\(.+\)\.(parse|safeParse)\(/.test(content) ||
        /z\.object\(.+\)\.(parse|safeParse)\(/.test(content) ||
        /Yup\.object\(.+\)\.validateSync?\(/.test(content) ||
        /schema\.(parse|safeParse)\(/.test(content)
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
