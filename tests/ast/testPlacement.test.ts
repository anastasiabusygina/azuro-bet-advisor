import fs from 'fs';
import path from 'path';
import { ROOT_DIR, AST_TESTS_DIR, isTestProperlyPlaced, isASTTest } from '../configs/testPlacement.config';

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

describe('🧪 Проверка расположения тестов рядом с функциональными файлами', () => {
  const allTests = findAllTests(ROOT_DIR);

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
