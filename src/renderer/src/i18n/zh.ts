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
    displayNamePh: '例如 GLM-5.3',
    baseUrl: 'Base URL',
    baseUrlPh: 'https://…（输入或选择预设）',
    apiKey: 'API Key',
    apiKeyPh: 'sk-...',
    modelId: '模型 ID',
    modelIdPh: 'glm-5.3',
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
    aliasesTitle: '终端别名',
    aliasesHint: '（跟随上方 Plan / Work 卡片的选择）',
    copy: '复制别名',
    copied: '已复制！',
    aliasesTip: '💡 沿用 export 形式设置环境变量，在 $CC_MODE_DIR 下生成以绑定模型显示名命名的临时 settings JSON（如 $CC_MODE_DIR/GLM-5.3.json），并定义当前选中模式的别名（Plan → cc-p，Work → cc-w）。别名带 --setting-sources "" + --settings <tmpfile>，优先级高于 ~/.claude/settings.json —— 本应用绝不读写该文件。',
    modePlan: 'Plan（分析/设计）',
    modeWork: 'Work（编码/执行）',
    needModel: '# 请先在「模型」页添加模型，并在「切换器」页完成绑定',
    launch: '在终端中打开',
    launchNoModel: '🔴 请先绑定模型',
    launchOk: '🖥️ 终端已打开，别名已就绪',
    launchFail: '🔴 打开终端失败：{error}',
    launchHint: '✅ 已就绪 —— Plan 输入 cc-p，Work 输入 cc-w',
    ccpDesc: 'Plan：开启 extended thinking + plan 权限模式',
    ccwDesc: 'Work：默认权限',
    tmpDir: '为每个模式生成临时 settings 文件（通过 --settings 加载；优先级高于 ~/.claude/settings.json）',
    aliasesLabel: '别名 —— --setting-sources "" 禁用默认源；--settings 以最高优先级加载临时文件'
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
    about: '关于',
    version: '版本'
  }
}
