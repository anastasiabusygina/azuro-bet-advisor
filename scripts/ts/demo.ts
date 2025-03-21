import { processRecommendation } from './matchButtonMapper.js';

/**
 * Демонстрационный скрипт для проверки работы модуля сопоставления рекомендаций
 */
async function runDemo() {
  console.log('===== Azuro Bet Advisor Demo =====');
  console.log('Проверка сопоставления ID с кнопками интерфейса\n');
  
  // Примеры рекомендаций для разных типов ставок
  const recommendations = [
    // 1X2 (Победа хозяев)
    {
      gameId: '0x3b182e9fbf50398a412d17d7969561e3bfcc4fa4_486903000486903001',
      conditionId: '486903008559711340',
      outcomeId: '29',
      description: 'Ставка на победу хозяев (1)'
    },
    // 1X2 (Ничья)
    {
      gameId: '0x3b182e9fbf50398a412d17d7969561e3bfcc4fa4_486903000486903001',
      conditionId: '486903008559711340',
      outcomeId: '30',
      description: 'Ставка на ничью (X)'
    },
    // Тотал голов больше 2.5
    {
      gameId: '0x3b182e9fbf50398a412d17d7969561e3bfcc4fa4_486903000486903001',
      conditionId: '1000000000000000000000000000000000000640393189',
      outcomeId: '38',
      description: 'Ставка на тотал больше 2.5'
    },
    // Двойной шанс 1X
    {
      gameId: '0x3b182e9fbf50398a412d17d7969561e3bfcc4fa4_486903000486903001',
      conditionId: '486903023486903024',
      outcomeId: '6266',
      description: 'Ставка на двойной шанс 1X'
    },
    // Комбинированная ставка
    {
      gameId: '0x3b182e9fbf50398a412d17d7969561e3bfcc4fa4_486903000486903001',
      conditionId: '1000000000000000000000000000000000000640393189',
      outcomeId: '9738',
      description: 'Комбинированная ставка: победа хозяев и тотал больше 2.5'
    }
  ];
  
  // Обрабатываем каждую рекомендацию
  for (const [index, recommendation] of recommendations.entries()) {
    console.log(`\n--- Тест ${index + 1}: ${recommendation.description} ---`);
    
    try {
      const result = await processRecommendation(recommendation);
      console.log(result);
    } catch (error) {
      console.error(`Ошибка при обработке рекомендации ${index + 1}:`, error);
    }
    
    console.log('-----------------------------------\n');
  }
  
  console.log('Демонстрация завершена!');
}

// Запускаем демонстрацию
runDemo().catch(error => {
  console.error('Критическая ошибка в демо-скрипте:', error);
}); 