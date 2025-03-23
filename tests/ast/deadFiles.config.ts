/**
 * Dead Files Configuration
 * 
 * This file defines files that are considered valid entry points, even if they
 * aren't imported by other files in the project.
 * 
 * These files are typically directly executed scripts or entry points that are
 * referenced in package.json, webpack config, or other build tools.
 * 
 * Usage example:
 * 
 * ```
 * import { entryFiles } from './deadFiles.config';
 * 
 * // Exclude entry files from the list of unused files
 * const unusedFiles = allFiles.filter(
 *   (file) => !usedFiles.has(file) && !entryFiles.includes(file)
 * );
 * ```
 */

/**
 * List of files that are valid entry points in the project
 * These files won't be flagged as "dead" even if they aren't imported anywhere
 */
export const entryFiles = [
  'src/scripts/matches.ts',
  'src/scripts/buttons.ts',
];

/**
 * List of files and patterns to ignore during the dead files check
 * These files are excluded from analysis
 */
export const deadFilesIgnore = [
  '**/*.test.ts',
  '**/*.d.ts',
  '**/index.ts',
  'src/config/env.ts',
  'src/config/validateEnv.ts',
  'scripts/node/**',
  'archive/**'
]; 