// Настройка тестовой среды Jest
import { jest } from '@jest/globals';
import type { Response } from 'node-fetch';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Заглушка для fetch в Node.js
global.fetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;

// Подготовка среды для тестов
beforeAll(() => {
  // Можно отключить или перенаправить console.log в тестах
  // console.log = jest.fn();
  
  // Или можно перехватывать вывод для анализа
  // console.log = (...args) => {
  //   // Сохраняем вывод для проверки в тестах
  //   consoleOutput.push(args);
  // };
});

// Восстановление после всех тестов
afterAll(() => {
  // Восстанавливаем оригинальные функции консоли
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Глобальные настройки для тестов
jest.setTimeout(30000); // Увеличиваем таймаут для асинхронных тестов

export const teardown = (): void => {
  // Восстанавливаем оригинальные функции консоли
  // Дополнительная функция для очистки после всех тестов
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}; 