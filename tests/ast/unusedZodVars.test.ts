import { parse } from '@babel/parser';
import * as fs from 'fs';
import * as path from 'path';
import type { Node } from 'estree';
import * as glob from 'glob';
import * as ts from 'typescript';

// Файлы, которые ОБЯЗАТЕЛЬНО должны иметь валидацию Zod
const mandatoryZodValidationFiles = [
  'src/config/config.ts',
  'src/config/validateEnv.ts'
];

// Исключения - файлы, которые НЕ должны проверяться
const excludePatterns = [
  // Исключаем файлы сборки
  'dist/**/*',
  'build/**/*',
  // Исключаем временные файлы
  'temp/**/*',
  'tmp/**/*',
  // Другие исключения можно добавить здесь
];

// Получаем список всех файлов проекта для проверки
const getAllProjectFiles = (): string[] => {
  // Шаблоны файлов и директорий, которые нужно исключить
  const excludePatterns: string[] = [
    'node_modules',
    'dist',
    'build',
    'coverage',
    'tests',
    '.git',
    '.idea',
    'public',
    'static'
  ];
  
  // Получаем список всех файлов .ts и .js в директории src
  const allFiles = glob.sync('src/**/*.{ts,js}', { ignore: excludePatterns.map(pattern => `**/${pattern}/**`) });
  
  // Возвращаем относительные пути
  return allFiles;
};

// Функция для определения наличия Zod-валидации в файле
const hasZodValidation = (content: string): boolean => {
  return (
    /Zod\.object\(.+\)\.(parse|safeParse)\(/.test(content) ||
    /z\.object\(.+\)\.(parse|safeParse)\(/.test(content) ||
    /schema\.(parse|safeParse)\(/.test(content) ||
    /configSchema\.parse\(/.test(content) ||
    /\.parse\(process\.env\)/.test(content)
  );
};

// Функция для нахождения всех файлов с Zod-валидацией
const findFilesWithZodValidation = (): string[] => {
  const allFiles = getAllProjectFiles();
  const filesWithZod: string[] = [];
  
  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      if (hasZodValidation(content)) {
        // Используем тихий лог, чтобы не загромождать вывод
        // console.log(`✅ Найдена валидация Zod в файле: ${file}`);
        filesWithZod.push(file);
      }
    } catch (error) {
      console.error(`Ошибка при проверке файла ${file}:`, error);
    }
  });
  
  return filesWithZod;
};

// Функция для нахождения переменных и констант в файле
const findExportedVariables = (file: string): string[] => {
  try {
    const fileContent = fs.readFileSync(file, 'utf-8');
    const exportedVariables: string[] = [];
    
    // Используем typescript AST для получения информации о экспортируемых переменных
    const sourceFile = ts.createSourceFile(
      file,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Функция для обхода AST дерева и поиска экспортируемых переменных
    const traverseAst = (node: ts.Node) => {
      // Проверяем, является ли нода объявлением переменной с экспортом
      if (ts.isVariableStatement(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach(declaration => {
          if (ts.isIdentifier(declaration.name)) {
            const variableName = declaration.name.text;
            // console.log(`Найдена экспортируемая переменная: ${variableName} в файле ${file}`);
            exportedVariables.push(variableName);
          }
        });
      }
      
      // Ищем экспорт по умолчанию
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
        const variableName = node.expression.text;
        // console.log(`Найдена экспортируемая переменная по умолчанию: ${variableName} в файле ${file}`);
        exportedVariables.push(variableName);
      }
      
      // Рекурсивно обходим все дочерние узлы
      ts.forEachChild(node, traverseAst);
    };
    
    traverseAst(sourceFile);
    return exportedVariables;
  } catch (error) {
    console.error(`Ошибка при поиске экспортируемых переменных в файле ${file}:`, error);
    return [];
  }
};

// Функция для проверки использования переменной
const checkIfVariableIsUsed = (variableName: string, sourceFile: string): { isUsed: boolean, usedInFiles: string[] } => {
  // Получаем все файлы проекта
  const allFiles = getAllProjectFiles();
  const usedInFiles: string[] = [];
  
  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Импорт переменной может выглядеть по-разному, проверяем все варианты
      const importPatterns = [
        new RegExp(`import\\s+{[^}]*\\b${variableName}\\b[^}]*}\\s+from\\s+['"]`),
        new RegExp(`import\\s+${variableName}\\s+from\\s+['"]`),
        new RegExp(`(?<!['"])\\b${variableName}\\b(?!\\s*:)`)
      ];
      
      // Проверяем наличие импорта или использования переменной
      if (file !== sourceFile && importPatterns.some(pattern => pattern.test(content))) {
        usedInFiles.push(file);
      }
    } catch (error) {
      console.error(`Ошибка при чтении файла ${file}:`, error);
    }
  });
  
  return {
    isUsed: usedInFiles.length > 0,
    usedInFiles
  };
};

// Функция для проверки всех файлов и переменных
const checkAllVariablesUsage = () => {
  try {
    // Находим все файлы с Zod-валидацией
    const filesWithZod = findFilesWithZodValidation();
    
    if (filesWithZod.length === 0) {
      console.warn('⚠️ Не найдено файлов с Zod-валидацией!');
      return true; // Тест проходит, если нет файлов для проверки
    }
    
    // Для каждого файла находим экспортируемые переменные и проверяем их использование
    let totalVars = 0;
    let unusedVars = 0;
    const unusedVarsDetails: {file: string, varName: string}[] = [];
    const allVarsDetails: {file: string, varName: string, isUsed: boolean, usedInFiles: string[]}[] = [];
    
    filesWithZod.forEach(file => {
      const exportedVars = findExportedVariables(file);
      totalVars += exportedVars.length;
      
      if (exportedVars.length === 0) {
        return;
      }
      
      exportedVars.forEach(varName => {
        const { isUsed, usedInFiles } = checkIfVariableIsUsed(varName, file);
        allVarsDetails.push({ file, varName, isUsed, usedInFiles });
        
        if (!isUsed) {
          unusedVars++;
          unusedVarsDetails.push({ file, varName });
        }
      });
    });
    
    // Выводим список всех переменных и файлов, где они используются
    console.log('\n=== СПИСОК ПЕРЕМЕННЫХ И ИХ ИСПОЛЬЗОВАНИЕ ===');
    
    // Сортируем по имени переменной для лучшей читаемости
    allVarsDetails.sort((a, b) => a.varName.localeCompare(b.varName));
    
    allVarsDetails.forEach(({ varName, file, isUsed, usedInFiles }) => {
      if (isUsed) {
        console.log(`${varName} (из ${file}) → ${usedInFiles.join(', ')}`);
      } else {
        console.warn(`${varName} (из ${file}) → НЕ ИСПОЛЬЗУЕТСЯ`);
      }
    });
    
    // Статистика
    console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===');
    console.log(`Всего файлов с Zod: ${filesWithZod.length}`);
    console.log(`Всего переменных: ${totalVars}`);
    console.log(`Используемых переменных: ${totalVars - unusedVars}`);
    console.log(`Неиспользуемых переменных: ${unusedVars}`);
    
    // Проверяем наличие обязательных файлов
    const missingMandatory = mandatoryZodValidationFiles.filter(
      file => !filesWithZod.includes(file)
    );
    
    expect(missingMandatory.length).toBe(0);
    
    // Проверяем, что все переменные используются
    if (unusedVars.length > 0) {
      console.error(`\n❌ Найдены неиспользуемые переменные: ${unusedVars.map(v => `${v.varName} (из ${v.file})`).join(', ')}`);
    }
    expect(unusedVars.length).toBe(0);
    
    return true;
  } catch (error) {
    console.error('Ошибка при проверке использования переменных:', error);
    return false;
  }
};

// Проверяем наличие параметра --run в аргументах запуска
const shouldRunImmediately = process.argv.includes('--run');

// Запускаем проверку сразу, если указан параметр --run
if (shouldRunImmediately) {
  console.log('Запуск проверки переменных из файлов с Zod...');
  checkAllVariablesUsage();
}

// Добавляем Jest-тест только если мы в среде Jest
if (typeof describe !== 'undefined') {
  describe('Проверка файлов с Zod-валидацией', () => {
    test('обязательные файлы должны содержать валидацию Zod', () => {
      const filesWithZod = findFilesWithZodValidation();
      expect(filesWithZod).toEqual(expect.arrayContaining(mandatoryZodValidationFiles));
    });
    
    test('все переменные из файлов с Zod должны использоваться в коде', () => {
      // Находим все файлы с Zod-валидацией
      const filesWithZod = findFilesWithZodValidation();
      
      // Сохраняем данные обо всех переменных
      const allVarsDetails: {file: string, varName: string, isUsed: boolean, usedInFiles: string[]}[] = [];
      const unusedVars: {file: string, varName: string}[] = [];
      
      // Создаем Map для отслеживания обработанных переменных и предотвращения дублирования
      const processedVars = new Map<string, {file: string, isUsed: boolean, usedInFiles: string[]}>();
      
      // Собираем информацию о всех переменных
      filesWithZod.forEach(file => {
        const exportedVars = findExportedVariables(file);
        
        exportedVars.forEach(varName => {
          // Проверяем, не обрабатывали ли мы уже эту переменную из этого файла
          const varKey = `${varName}:${file}`;
          if (!processedVars.has(varKey)) {
            const { isUsed, usedInFiles } = checkIfVariableIsUsed(varName, file);
            allVarsDetails.push({ file, varName, isUsed, usedInFiles });
            processedVars.set(varKey, { file, isUsed, usedInFiles });
            
            if (!isUsed) {
              unusedVars.push({ file, varName });
            }
          }
        });
      });
      
      // Выводим список ВСЕХ переменных и файлов, где они используются
      console.log('\n=== СПИСОК ПЕРЕМЕННЫХ И ИХ ИСПОЛЬЗОВАНИЕ ===');
      
      // Сортируем по имени переменной для лучшей читаемости
      allVarsDetails.sort((a, b) => a.varName.localeCompare(b.varName));
      
      allVarsDetails.forEach(({ varName, file, isUsed, usedInFiles }) => {
        if (isUsed) {
          console.log(`${varName} (из ${file}) → ${usedInFiles.join(', ')}`);
        } else {
          console.warn(`${varName} (из ${file}) → НЕ ИСПОЛЬЗУЕТСЯ`);
        }
      });
      
      // Статистика
      console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===');
      console.log(`Всего файлов с Zod: ${filesWithZod.length}`);
      console.log(`Всего переменных: ${allVarsDetails.length}`);
      console.log(`Используемых переменных: ${allVarsDetails.length - unusedVars.length}`);
      console.log(`Неиспользуемых переменных: ${unusedVars.length}`);
      
      // Проверяем наличие обязательных файлов
      const missingMandatory = mandatoryZodValidationFiles.filter(
        file => !filesWithZod.includes(file)
      );
      
      expect(missingMandatory.length).toBe(0);
      
      // Проверяем, что все переменные используются
      if (unusedVars.length > 0) {
        console.error(`\n❌ Найдены неиспользуемые переменные: ${unusedVars.map(v => `${v.varName} (из ${v.file})`).join(', ')}`);
      }
      expect(unusedVars.length).toBe(0);
    });
  });
}

// Если мы НЕ в среде Jest, запускаем основное тестирование
if (typeof describe === 'undefined') {
  console.clear();
  console.log("=== Проверка переменных из файлов с Zod ===");
  
  // Находим все файлы с Zod-валидацией
  const filesWithZod = findFilesWithZodValidation();
  
  // Сохраняем данные обо всех переменных
  const allVarsDetails: {file: string, varName: string, isUsed: boolean, usedInFiles: string[]}[] = [];
  const unusedVars: {file: string, varName: string}[] = [];
  
  // Создаем Map для отслеживания обработанных переменных и предотвращения дублирования
  const processedVars = new Map<string, {file: string, isUsed: boolean, usedInFiles: string[]}>();
  
  // Собираем информацию о всех переменных
  filesWithZod.forEach(file => {
    const exportedVars = findExportedVariables(file);
    
    exportedVars.forEach(varName => {
      // Проверяем, не обрабатывали ли мы уже эту переменную из этого файла
      const varKey = `${varName}:${file}`;
      if (!processedVars.has(varKey)) {
        const { isUsed, usedInFiles } = checkIfVariableIsUsed(varName, file);
        allVarsDetails.push({ file, varName, isUsed, usedInFiles });
        processedVars.set(varKey, { file, isUsed, usedInFiles });
        
        if (!isUsed) {
          unusedVars.push({ file, varName });
        }
      }
    });
  });
  
  // Выводим список ВСЕХ переменных и файлов, где они используются
  console.log('\n=== СПИСОК ПЕРЕМЕННЫХ И ИХ ИСПОЛЬЗОВАНИЕ ===');
  
  // Сортируем по имени переменной для лучшей читаемости
  allVarsDetails.sort((a, b) => a.varName.localeCompare(b.varName));
  
  allVarsDetails.forEach(({ varName, file, isUsed, usedInFiles }) => {
    if (isUsed) {
      console.log(`${varName} (из ${file}) → ${usedInFiles.join(', ')}`);
    } else {
      console.warn(`${varName} (из ${file}) → НЕ ИСПОЛЬЗУЕТСЯ`);
    }
  });
  
  // Статистика
  console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===');
  console.log(`Всего файлов с Zod: ${filesWithZod.length}`);
  console.log(`Всего переменных: ${allVarsDetails.length}`);
  console.log(`Используемых переменных: ${allVarsDetails.length - unusedVars.length}`);
  console.log(`Неиспользуемых переменных: ${unusedVars.length}`);
}

// Экспорт функций для использования в других модулях или запуска из командной строки
export { findFilesWithZodValidation, findExportedVariables, checkIfVariableIsUsed, checkAllVariablesUsage };
