export default {
  app: {
    title: 'CC Mode Switcher',
    subtitle: 'Claude Code Plan / Work 双模式环境切换器'
  },
  tabs: {
    models: '模型',
    switcher: '切换器',
    settings: '设置'
  },
  header: {
    toLight: '切换到浅色模式',
    toDark: '切换到深色模式',
    toZh: '切换到中文',
    toEn: 'Switch to English'
  },
  models: {
    title: '已配置的模型',
    addTip: '添加模型',
    empty: '还没有配置模型，点击上方按钮添加一个。'
  },
  form: {
    addTitle: '添加模型',
    editTitle: '编辑模型',
    displayName: '显示名称',
    displayNamePh: '例如 GLM-5.2',
    baseUrl: 'Base URL',
    baseUrlPh: 'https://…（输入或选择预设）',
    apiKey: 'API Key',
    apiKeyPh: 'sk-...',
    modelId: '模型 ID',
    modelIdPh: 'glm-5.2',
    cancel: '取消',
    submitAdd: '添加模型',
    submitEdit: '保存修改',
    validation: '请填写名称、Base URL 和 API Key'
  },
  card: {
    model: '模型',
    edit: '编辑',
    duplicate: '复制配置',
    test: '测试连接',
    testing: '测试中…',
    delete: '删除'
  },
  toast: {
    connected: '🟢 {name} · 连接成功 {ms}ms（HTTP {status}）',
    unreachable: '🔴 {name} · 无法连接（{error}）',
    testFailed: '🔴 {name} · 测试失败',
    duplicated: '📋 已复制为 "{name}"'
  },
  modal: {
    deleteTitle: '删除模型',
    deleteMessage: '确定删除 "{name}" 吗？此操作不可撤销。',
    delete: '删除',
    cancel: '取消'
  },
  switcher: {
    planTitle: 'Plan 模式',
    planDesc: '架构分析 / 设计 / 代码评审',
    workTitle: 'Work 模式',
    workDesc: '实现 / 调试 / 文件操作',
    noModel: '⚠️ 未绑定模型',
    binding: '模式绑定',
    planUses: 'Plan 使用模型',
    workUses: 'Work 使用模型',
    select: '请选择…',
    cliTitle: 'CLI 启动命令',
    cliHint: '（复制并粘贴到终端）',
    copy: '复制命令',
    copied: '已复制！',
    tip: '💡 在终端打开或粘贴到 shell；Plan 运行 claude-plan，Work 直接运行 claude',
    modePlan: 'Plan（分析/设计）',
    modeWork: 'Work（编码/执行）',
    needModel: '# 请先在「模型」页添加模型，并在「切换器」页完成绑定',
    launch: '在终端中打开',
    launchNoModel: '🔴 请先绑定模型',
    launchOk: '🖥️ 终端已打开，环境变量已就绪',
    launchFail: '🔴 打开终端失败：{error}',
    overrideTitle: '检测到环境变量覆盖',
    overrideMsg:
      'Claude Code 配置（~/.claude/settings.json）中有 {count} 个环境变量，优先级高于终端环境变量，会覆盖你切换的模型。现在清除吗？（会先自动备份）',
    overrideClean: '清除并继续',
    overrideCleaned: '🧹 已清除 {count} 个覆盖变量（已备份）',
    overrideCleanFail: '🔴 清除覆盖变量失败：{error}'
  },
  settings: {
    title: '设置',
    appearance: '外观',
    theme: '主题',
    dark: '深色',
    light: '浅色',
    language: '语言',
    langEn: 'English',
    langZh: '中文',
    terminal: '终端',
    terminalHint: '供「在终端中打开」使用',
    choose: '选择…',
    notSet: '未设置',
    claudeOverrides: 'Claude Code 环境覆盖',
    overrideNone: '无 —— 终端环境变量生效',
    overrideFound: '⚠️ {count} 个变量会覆盖终端环境',
    clean: '清除',
    about: '关于',
    version: '版本'
  }
}
