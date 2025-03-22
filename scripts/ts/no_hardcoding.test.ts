// @ts-nocheck
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Проверка отсутствия хардкода в get_match_buttons.sh', () => {
  // Загружаем содержимое скрипта
  const scriptPath = path.resolve(__dirname, '../../get_match_buttons.sh');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Получаем только содержимое функции show_recommended_button
  const getShowRecommendedButtonContent = (content: string) => {
    const match = content.match(/show_recommended_button\(\)\s*{([\s\S]*?)^}/m);
    return match ? match[1] : '';
  };
  
  // Функция show_recommended_button для более детального анализа
  const functionContent = getShowRecommendedButtonContent(scriptContent);
  
  // Функция для поиска хардкодированных маппингов типов ставок
  const findHardcodedBetTypeMappings = (content: string): string[] => {
    // Ищем прямые присваивания строк переменным для маппинга типов ставок
    const hardcodedTypes = [];
    
    // Ищем case-конструкции с хардкодированными типами ставок
    const caseMatch = content.match(/case\s+\$\{?bet_type\}?\s+in\s+([\s\S]*?)esac/);
    
    if (caseMatch) {
      // Извлекаем все кейсы из case-конструкции
      const caseParts = caseMatch[1].split(')');
      
      // Для каждого кейса проверяем, содержит ли он хардкодированные значения
      caseParts.forEach(part => {
        // Извлекаем условие из кейса
        const conditionMatch = part.match(/["|'](.*?)["|']/);
        if (conditionMatch) {
          const condition = conditionMatch[1];
          // Добавляем условие, если оно не содержит переменные
          if (!condition.includes('$')) {
            hardcodedTypes.push(condition);
          }
        }
      });
    }
    
    return hardcodedTypes;
  };
  
  // Функция для проверки правильного использования библиотеки
  const checksCorrectLibraryUsage = (content: string): boolean => {
    // Проверяем, что section_name получается через вызов get_market_name
    const usesGetMarketName = /section_name=\$\(get_market_name/.test(content);
    return usesGetMarketName;
  };
  
  // Проверка на хардкодированные числовые значения форы или тотала
  const findHardcodedHandicapValues = (content: string): string[] => {
    // Ищем присваивания вида button_name="$button_name (значение)", где значение - число в скобках
    const handicapAssignments = content.match(/button_name=".*?\([^)]*?\)"/g) || [];
    
    const hardcodedValues = [];
    
    // Для каждого присваивания извлекаем значение в скобках
    handicapAssignments.forEach(assignment => {
      const match = assignment.match(/\(([^)]+)\)/);
      if (match) {
        const value = match[1];
        // Если значение не содержит переменные, считаем его хардкодом
        if (!value.includes('$')) {
          hardcodedValues.push(value);
        }
      }
    });
    
    return hardcodedValues;
  };
  
  // Список допустимых значений для параметров (хардкодирование этих значений разрешено)
  const ALLOWED_HANDICAP_VALUES = [
    "-1", "-0.5", "0", "0.5", "1", "(1)", "(-1)", "(-0.5)", "(0)", "(0.5)", "(1)", "1.5", "2.5"
  ];
  
  // Проверка на наличие хардкодированных значений исходов
  const findHardcodedOutcomes = (content: string): string[] => {
    // Список допустимых значений для исходов
    const ALLOWED_OUTCOMES = [
      "Team 1", "Team 2", "1", "2", "X", "Draw", "Over", "Under", "Yes", "No", 
      "1X", "12", "X2"
    ];
    
    // Ищем сравнения вида [[ "$title" == "значение" ]] или [[ "$button_name" == "значение" ]]
    const comparisons = content.match(/\[\[\s+\$\{?title\}?\s*==\s*["']([^"']+)["']\s*\]\]|\[\[\s+\$\{?button_name\}?\s*==\s*["']([^"']+)["']\s*\]\]/g) || [];
    
    const hardcodedOutcomes = [];
    
    // Для каждого сравнения извлекаем значение
    comparisons.forEach(comparison => {
      const match = comparison.match(/==\s*["']([^"']+)["']/);
      if (match) {
        const value = match[1];
        // Если значение не в списке допустимых, считаем его хардкодом
        if (!ALLOWED_OUTCOMES.includes(value) && !value.includes('$')) {
          hardcodedOutcomes.push(value);
        }
      }
    });
    
    return hardcodedOutcomes;
  };
  
  // Проверка на наличие хардкодированных названий разделов ставок
  const findHardcodedSectionNames = (content: string): string[] => {
    // Ищем прямые присваивания строковых констант переменной section_name
    const sectionAssignments = content.match(/section_name=["']([^"'$]+)["']/g) || [];
    
    return sectionAssignments.map(assignment => assignment.match(/section_name=["']([^"']+)["']/)[1])
      .filter(name => name !== "bet_type" && name !== "${bet_type}");
  };
  
  test('Не должен содержать хардкодированных маппингов типов ставок', () => {
    const hardcodedMappings = findHardcodedBetTypeMappings(functionContent);
    if (hardcodedMappings.length > 0) {
      console.log('Найдены хардкодированные маппинги типов ставок:', hardcodedMappings);
    }
    expect(hardcodedMappings).toEqual([]);
  });
  
  test('Должен использовать функции из библиотеки Azuro для получения названий', () => {
    const usesLibrary = checksCorrectLibraryUsage(functionContent);
    expect(usesLibrary).toBe(true);
  });
  
  test('Должен использовать get_market_name для получения названий разделов', () => {
    const usesGetMarketName = /section_name=\$\(get_market_name/.test(functionContent);
    expect(usesGetMarketName).toBe(true);
  });
  
  test('Должен использовать get_selection_name для получения названий кнопок', () => {
    const usesGetSelectionName = /selection_name=\$\(get_selection_name/.test(functionContent);
    expect(usesGetSelectionName).toBe(true);
  });
  
  test('Не должен содержать хардкодированных значений форы или тотала, кроме допустимых', () => {
    const hardcodedValues = findHardcodedHandicapValues(functionContent)
      .filter(value => !ALLOWED_HANDICAP_VALUES.includes(value));
    
    if (hardcodedValues.length > 0) {
      console.log('Найдены недопустимые хардкодированные значения форы/тотала:', hardcodedValues);
    }
    expect(hardcodedValues).toEqual([]);
  });
  
  test('Не должен содержать хардкодированных исходов', () => {
    const hardcodedOutcomes = findHardcodedOutcomes(functionContent);
    if (hardcodedOutcomes.length > 0) {
      console.log('Найдены хардкодированные исходы:', hardcodedOutcomes);
    }
    expect(hardcodedOutcomes).toEqual([]);
  });
  
  test('Не должен содержать хардкодированных названий разделов ставок', () => {
    const hardcodedSections = findHardcodedSectionNames(functionContent);
    if (hardcodedSections.length > 0) {
      console.log('Найдены хардкодированные названия разделов:', hardcodedSections);
    }
    expect(hardcodedSections).toEqual([]);
  });
  
  test('Должен получать все названия команд и параметры динамически', () => {
    // Проверяем корректное использование переменных для команд и параметров
    expect(functionContent).toContain('$home_team');
    expect(functionContent).toContain('$away_team');
    expect(functionContent).toContain('$display_parameter');
    expect(functionContent).toContain('$parameter');
    expect(functionContent).toContain('$market_parameter');
    expect(functionContent).toContain('$outcome_parameter');
  });
}); 