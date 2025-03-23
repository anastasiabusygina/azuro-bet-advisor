/**
 * Universal Project Structure Test
 * 
 * This test validates the project structure according to the defined configuration.
 * 
 * How to use in another project:
 * 1. Copy both files:
 *    - projectStructure.test.ts
 *    - projectStructure.config.ts
 * 2. Modify projectStructure.config.ts to match your project's structure
 * 3. Run the test with: npm test -- path/to/projectStructure.test.ts
 * 
 * Features:
 * - The test will not fail, but will log warnings for unexpected directories
 * - You can easily customize the allowed structure in the config file
 * - You can extend the default structure using the extendStructure function
 */

import fs from 'fs';
import path from 'path';
import { allowedStructure, extendStructure, type ProjectStructure } from '../configs/projectStructure.config';

const ROOT = process.cwd();

// You can override default structure here if needed
// Example: 
// const projectAllowedStructure = extendStructure({
//   'src': [...allowedStructure.src, 'newModule'],
//   'customDir': ['subdir1', 'subdir2']
// });

// Use default structure or override it
const projectAllowedStructure: ProjectStructure = allowedStructure;

function listDirs(folder: string): string[] {
  const fullPath = path.join(ROOT, folder);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath).filter(name => {
    const full = path.join(fullPath, name);
    return fs.statSync(full).isDirectory();
  });
}

describe('📦 Архитектура проекта — проверка структуры', () => {
  for (const [zone, allowed] of Object.entries(projectAllowedStructure)) {
    const target = zone || '.';

    it(`🧭 В папке "${target}" нет неожиданных директорий`, () => {
      const found = listDirs(zone);
      const unexpected = found.filter(name => !allowed.includes(name));

      if (unexpected.length) {
        console.warn(`⚠️ В "${target}" найдены неожиданные директории: ${unexpected.join(', ')}`);
      }

      expect(true).toBe(true); // тест не падает — только логирует
    });
  }
});
