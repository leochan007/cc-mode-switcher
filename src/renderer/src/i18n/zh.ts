export default {
  app: {
    title: 'CC Mode Switcher',
    subtitle: 'Claude Code 多角色切换器'
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
  toolbar: {
    cwdTitle: '新会话的工作目录',
    cwdPick: '选择工作目录',
    cwdPrompt: '新会话的工作目录：',
    startSelected: '启动选中角色',
    addRole: '新增角色',
    models: '模型管理',
    reset: '重置角色',
    resetTip: '恢复默认 Plan + Worker（保留模型与已编辑的提示词文件）',
    theme: '切换主题'
  },
  roles: {
    filterPh: '按 id / 标签 / 模型筛选…',
    table: '表格',
    add: '新增角色',
    empty: '暂无角色。点击 ➕ 创建一个。',
    unbound: '（未绑定）',
    manageModels: '管理模型…',
    edit: '编辑',
    delete: '删除',
    duplicate: '复制',
    dragTip: '拖动以排序',
    colId: '角色',
    colModel: '模型',
    colThinking: '思考',
    colOps: '操作'
  },
  detail: {
    title: '启动面板',
    noneSelected: '未选中角色',
    empty: '左侧选中一个角色即可预览启动脚本。',
    copy: '复制脚本',
    copied: '已复制！',
    menuCopyAll: '复制整个脚本',
    menuCopySelection: '复制选中部分',
    menuSelectAll: '全选',
    openShell: '启动内置终端(然后输入别名)',
    openWindow: '打开外部终端',
    model: '模型',
    unbound: '未绑定',
    thinking: '思考',
    on: '开',
    off: '关',
    allow: '允许工具',
    deny: '禁止工具'
  },
  yaml: {
    reload: '重新载入',
    save: '保存',
    unsaved: '有未保存修改',
    line: '行',
    confirmReload: '放弃当前修改，从磁盘重新载入？',
    saved: 'roles.yaml 已保存',
    saveFail: '保存失败：{error}'
  },
  picker: {
    title: '新建会话',
    subtitle: '选择角色。未绑定模型的角色会被禁用。',
    cancel: '取消',
    empty: '暂无角色，请先添加。',
    noModel: '（未绑定模型）'
  },
  terminal: {
    emptyTitle: '当前没有会话',
    emptyHint: '点 ▶ 启动选中角色，或按 Cmd+N（或 Option+T）启动。',
    close: '关闭 Tab',
    clone: '克隆 Tab'
  },
  roleEdit: {
    title: '编辑角色 "{name}"',
    namePrompt: '新角色名：',
    model: '绑定模型',
    thinking: '开启扩展思考（MAX_THINKING_TOKENS=16000）',
    systemPrompt: '系统提示词（内联，直接存在 roles.yaml 里）',
    systemPromptPh: '# 你是...\n描述这个角色的职责和工作流。',
    allowedTools: '允许工具（Read / LS / Glob / Grep…）',
    disallowedTools: '禁止工具（Edit / Write / Bash…）',
    disallowedPlugins: '禁用插件（始终追加 superpowers）',
    cancel: '取消',
    save: '保存'
  },
  confirm: {
    resetTitle: '重置角色',
    resetMessage: '恢复默认的 Plan + Worker 角色？模型与已编辑的提示词文件不会被改动。',
    reset: '重置',
    deleteRoleTitle: '删除角色',
    deleteRoleMessage: '确定删除角色 "{id}" 吗？此操作不可撤销。',
    delete: '删除'
  },
  toast: {
    roleAdded: '➕ 已添加角色 "{id}"',
    roleSaved: '✅ 角色已保存',
    roleDeleted: '🗑️ 角色已删除',
    roleDuplicated: '📋 已复制为 "{id}"',
    roleReset: '♻️ 已恢复默认角色',
    addModelFirst: '💡 请先在「模型」页添加一个模型',
    noRole: '🔴 请先选中一个角色',
    noModel: '🔴 角色未绑定模型，请先在「模型」页添加并绑定。',
    tabOpenFail: '🔴 启动终端会话失败',
    launchOk: '🖥️ 已打开外部终端',
    launchFail: '🔴 打开终端失败：{error}',
    duplicated: '📋 已复制为 "{name}"',
    connected: '🟢 {name} · 连接成功 {ms}ms（HTTP {status}）',
    unreachable: '🔴 {name} · 无法连接（{error}）',
    testFailed: '🔴 {name} · 测试失败',
    scriptCopied: '📋 启动脚本已复制 —— 粘贴到 Terminal',
    copyFail: '🔴 复制失败',
    noBoundRole: '💡 请先给角色绑定模型'
  },
  models: {
    title: '已配置的模型',
    addTip: '添加模型',
    subtitle: '所有角色共享这一组模型。',
    hint: '角色通过 id 引用这些模型。',
    empty: '还没有模型，请先添加以启用角色。'
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
    testing: '测试中',
    delete: '删除'
  },
  modal: {
    deleteTitle: '删除模型',
    deleteMessage: '确定删除 "{name}" 吗？此操作不可撤销。',
    delete: '删除',
    cancel: '取消'
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
    terminal: '外部终端',
    terminalHint: '供「在外部终端中打开」使用',
    choose: '选择…',
    notSet: '未设置',
    about: '关于',
    version: '版本',
    roles: '角色',
    resetRoles: '重置角色',
    resetTip: '恢复默认的 Plan + Worker（保留模型与已编辑的提示词文件）'
  }
}