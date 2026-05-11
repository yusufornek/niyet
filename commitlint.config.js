/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Yeni özellik
        'fix', // Bug fix
        'docs', // Sadece dokümantasyon
        'style', // Format (whitespace, semicolons)
        'refactor', // Davranış değişmeden kod yeniden organizasyon
        'perf', // Performans iyileştirmesi
        'test', // Test ekleme/düzeltme
        'build', // Build sistemi / external deps
        'ci', // CI yapılandırması
        'chore', // Diğer (config, vs)
        'revert', // Geri al
      ],
    ],
    'scope-enum': [
      1, // warning level
      'always',
      [
        'web',
        'db',
        'graphql',
        'ai',
        'core',
        'ui',
        'config',
        'auth',
        'docs',
        'ci',
        'deps',
        'monorepo',
        'spending',
        'goals',
        'score',
        'circles',
        'chatbot',
      ],
    ],
    'subject-case': [0], // Türkçe karakterler için kapalı
    'header-max-length': [2, 'always', 100],
  },
};
