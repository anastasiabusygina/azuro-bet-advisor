import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const AST_TESTS_DIR = path.resolve(__dirname);

function findAllTests(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(findAllTests(fullPath));
    } else if (file.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

function isASTTest(filepath: string) {
  return filepath.startsWith(AST_TESTS_DIR);
}

function isTestProperlyPlaced(filepath: string) {
  const dirParts = path.dirname(filepath).split(path.sep);
  return dirParts.includes('__tests__') || dirParts.includes('tests');
}

describe('🧪 Проверка расположения тестов рядом с функциональными файлами', () => {
  const allTests = findAllTests(ROOT);

  for (const testFile of allTests) {
    if (isASTTest(testFile)) continue;

    it(`Тест ${testFile} должен лежать в tests/ или __tests__/`, () => {
      const ok = isTestProperlyPlaced(testFile);
      if (!ok) {
        throw new Error(`❌ ${testFile} — не в tests/ или __tests__/ рядом с кодом`);
      }
    });
  }
});
