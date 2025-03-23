// tests/ast/deadFiles.test.ts

import { glob } from 'glob';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { entryFiles, deadFilesIgnore } from '../configs/deadFiles.config';

describe('AST: Мёртвые файлы (неиспользуемые .ts)', () => {
  test('Поиск мёртвых файлов', () => {
    const allFiles = glob
      .sync('{src,scripts}/**/*.ts', { ignore: deadFilesIgnore })
      .map((f) => path.resolve(f)); // абсолютные пути

    const usedFiles = new Set<string>();
    const visited = new Set<string>();

    const importRegex =
      /(?:import\s+.*?\s+from\s+|import\(|require\()['"](.+?)['"]/g;

    const traverse = (absPath: string) => {
      const file = path.resolve(absPath);
      if (visited.has(file)) return;
      visited.add(file);

      let content: string;
      try {
        content = readFileSync(file, 'utf-8');
      } catch {
        return;
      }

      const dir = path.dirname(file);
      const importPaths = Array.from(content.matchAll(importRegex));

      for (const [, rawImportPath] of importPaths) {
        if (!rawImportPath.startsWith('.')) continue;

        const basePath = path.resolve(dir, rawImportPath);
        const tsPath = `${basePath}.ts`;
        const indexPath = path.join(basePath, 'index.ts');

        let resolved = '';
        if (allFiles.includes(tsPath)) {
          resolved = tsPath;
        } else if (allFiles.includes(indexPath)) {
          resolved = indexPath;
        } else {
          continue;
        }

        usedFiles.add(resolved);
        traverse(resolved);
      }
    };

    // Начинаем обход с абсолютных entry-файлов
    for (const entry of entryFiles) {
      traverse(path.resolve(entry));
    }

    const resolvedEntryFiles = entryFiles.map(entry => path.resolve(entry));
    const unusedFiles = allFiles.filter(
      (file) => !usedFiles.has(file) && !resolvedEntryFiles.includes(file)
    );

    if (unusedFiles.length > 0) {
      // Создаем список путей к мертвым файлам для включения в сообщение об ошибке
      const relativeUnusedFiles = unusedFiles.map((f) => 
        path.relative(process.cwd(), f)
      );

      console.log('🔍 Найдены мёртвые (неиспользуемые) файлы:');
      relativeUnusedFiles.forEach((f) => console.log(` - ${f}`));
      
      // Включаем список файлов в сообщение об ошибке
      const filesList = relativeUnusedFiles.map(f => `\n - ${f}`).join('');
      throw new Error(
        `В проекте обнаружены мёртвые файлы (${unusedFiles.length}) — их стоит удалить или заархивировать.${filesList}`
      );
    }
  });
});
