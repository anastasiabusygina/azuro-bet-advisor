// tests/ast/envConfigSeparation.config.ts

export const envConfigSeparation = {
	// Файлы, в которых разрешено обращаться к переменным окружения
	allowedEnvFiles: ['src/config/validateEnv.ts'],
  
	// Запрещать ли .default() в валидаторах переменных окружения
	disallowDefaults: true,
  
	// Запрещать ли fallback-значения (например, process.env.X || 'значение')
	disallowFallbacks: true
  };
  