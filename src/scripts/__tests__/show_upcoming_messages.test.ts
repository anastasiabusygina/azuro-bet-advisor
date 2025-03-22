describe('Проверка объявлений констант в show_upcoming_matches.sh', () => {
  const fs = require('fs');
  const path = require('path');
  
  // Путь к скрипту
  const scriptPath = path.join(__dirname, '../../../scripts/bash/show_upcoming_matches.sh');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  
  /**
   * Находит все объявления констант-сообщений в скрипте
   */
  const findMessageConstants = (content) => {
    // Ищем все строки, которые объявляют константы для сообщений (MSG_)
    const messageConstants = [];
    const regex = /^(MSG_[A-Z_]+)="([^"]+)"/gm;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      messageConstants.push({
        name: match[1],
        value: match[2]
      });
    }
    
    return messageConstants;
  };
  
  /**
   * Находит все объявления JSON-констант в скрипте
   */
  const findJsonConstants = (content) => {
    // Ищем все строки, которые объявляют константы для JSON (JSON_)
    const jsonConstants = [];
    const regex = /^(JSON_[A-Z_]+)="([^"]+)"/gm;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      jsonConstants.push({
        name: match[1],
        value: match[2]
      });
    }
    
    return jsonConstants;
  };
  
  /**
   * Находит все объявления текстовых констант для вывода
   */
  const findTextConstants = (content) => {
    // Ищем все строки, которые объявляют константы для текстового вывода (TEXT_)
    const textConstants = [];
    const regex = /^(TEXT_[A-Z_]+)="([^"]+)"/gm;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      textConstants.push({
        name: match[1],
        value: match[2]
      });
    }
    
    return textConstants;
  };
  
  test('Сообщения должны быть вынесены в константы', () => {
    const messageConstants = findMessageConstants(scriptContent);
    
    console.log('Найдены константы для сообщений:');
    messageConstants.forEach(const_ => {
      console.log(`${const_.name} = "${const_.value}"`);
    });
    
    // Проверяем, что есть хотя бы несколько определенных констант
    expect(messageConstants.length).toBeGreaterThan(3);
  });
  
  test('JSON константы должны быть вынесены в переменные', () => {
    const jsonConstants = findJsonConstants(scriptContent);
    
    console.log('Найдены константы для JSON:');
    jsonConstants.forEach(const_ => {
      console.log(`${const_.name} = "${const_.value}"`);
    });
    
    // Проверяем, что есть хотя бы несколько определенных констант
    expect(jsonConstants.length).toBeGreaterThan(5);
  });
  
  test('Текстовые константы для вывода должны быть вынесены в переменные', () => {
    const textConstants = findTextConstants(scriptContent);
    
    console.log('Найдены константы для текстового вывода:');
    textConstants.forEach(const_ => {
      console.log(`${const_.name} = "${const_.value}"`);
    });
    
    // Проверяем, что есть хотя бы несколько определенных констант
    expect(textConstants.length).toBeGreaterThan(3);
  });
}); 