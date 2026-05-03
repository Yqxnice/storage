module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // Bug 修复
        'docs',     // 文档变更
        'style',    // 代码格式（不影响功能）
        'refactor', // 重构（不是修复也不是新功能）
        'perf',     // 性能优化
        'test',     // 测试相关
        'build',    // 构建相关
        'ci',       // CI 配置
        'chore',    // 其他更改
        'revert',   // 回滚
      ],
    ],
    'type-case': [2, 'never', ['upper-case', 'lower-case']],
    'type-empty': [2, 'never'],
    'subject-case': [2, 'always', ['sentence-case', 'pascal-case', 'camel-case', 'lower-case', 'upper-case', 'snake-case', 'kebab-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
