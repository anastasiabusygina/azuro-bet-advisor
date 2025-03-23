/**
 * Project Structure Configuration
 * 
 * This file defines the allowed structure for project directories.
 * It can be customized for different projects without changing the test logic.
 * 
 * Structure format:
 * {
 *   'directory': ['allowed_subdirectory1', 'allowed_subdirectory2', ...],
 *   '': ['allowed_file_or_directory_in_root', ...]
 * }
 * 
 * Special keys:
 * - '' (empty string): represents the root directory of the project
 * 
 * Usage examples:
 * 
 * 1. Basic usage - import directly:
 *    ```
 *    import { allowedStructure } from './projectStructure.config';
 *    ```
 * 
 * 2. Extend the default configuration:
 *    ```
 *    import { extendStructure, allowedStructure } from './projectStructure.config';
 *    
 *    const customStructure = extendStructure({
 *      'src': [...allowedStructure.src, 'newModule'],
 *      'customDir': ['subdir1', 'subdir2']
 *    });
 *    ```
 * 
 * 3. Create a completely new configuration:
 *    ```
 *    import { type ProjectStructure } from './projectStructure.config';
 *    
 *    const myStructure: ProjectStructure = {
 *      'src': ['components', 'pages', 'utils'],
 *      'public': ['images', 'fonts'],
 *      '': ['src', 'public', 'package.json', 'tsconfig.json']
 *    };
 *    ```
 */

export const allowedStructure = {
  src: ['api', 'config', 'services', 'utils', 'types', 'interfaces', 'features', 'scripts'],
  scripts: ['bash', 'node', 'data'],
  tests: ['unit', 'integration', 'fixtures', 'ast', 'configs'],
  '': ['src', 'scripts', 'tests', 'docs', 'tasks', 'archive', 'dist', 'config', 'README.md', 'package.json', 'tsconfig.json', 'jest.config.ts', '.eslintrc.cjs', 'eslint.config.js', '.cursor', '.eslint', '.git', 'data', 'temp', 'node_modules']
};

// Type definition for project structure
export type ProjectStructure = {
  [key: string]: string[];
};

/**
 * Extends the default project structure with custom settings
 * 
 * @param customStructure - Custom directories and files to merge with the default structure
 * @returns A new structure combining default and custom settings
 * 
 * Note: Custom entries will override default entries with the same key
 */
export function extendStructure(customStructure: ProjectStructure): ProjectStructure {
  return {
    ...allowedStructure,
    ...customStructure
  };
}

/**
 * Helper function to add items to an existing structure section
 * 
 * @param structure - The base structure
 * @param section - The section to add items to
 * @param items - Items to add
 * @returns Updated structure
 */
export function addToSection(
  structure: ProjectStructure, 
  section: string, 
  items: string[]
): ProjectStructure {
  const currentSection = structure[section] || [];
  return {
    ...structure,
    [section]: [...currentSection, ...items]
  };
} 