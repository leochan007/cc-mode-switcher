export default {
  app: {
    title: 'CC Mode Switcher',
    subtitle: 'Multi-role scheduler for Claude Code'
  },
  tabs: {
    models: 'Models',
    switcher: 'Switcher',
    settings: 'Settings'
  },
  header: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    toZh: '切换到中文',
    toEn: 'Switch to English'
  },
  toolbar: {
    cwdTitle: 'Working directory for new sessions',
    cwdPick: 'Choose a working directory',
    cwdPrompt: 'Working directory for new sessions:',
    startSelected: 'Start Selected Role',
    addRole: 'Add Role',
    models: 'Models',
    reset: 'Reset Roles',
    resetTip: 'Restore default Plan + Worker (keeps models and edited prompt files)',
    theme: 'Toggle theme'
  },
  roles: {
    filterPh: 'Filter roles by id, label, or model…',
    table: 'Table',
    add: 'Add role',
    empty: 'No roles yet. Click ➕ to create one.',
    unbound: '(unbound)',
    manageModels: 'Manage models…',
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    dragTip: 'Drag to reorder',
    colId: 'Role',
    colModel: 'Model',
    colThinking: 'Thinking',
    colOps: 'Ops'
  },
  detail: {
    title: 'Launch Panel',
    noneSelected: 'No role selected',
    empty: 'Pick a role on the left to see the launch script.',
    copy: 'Copy script',
    copied: 'Copied!',
    menuCopyAll: 'Copy whole script',
    menuCopySelection: 'Copy selection',
    menuSelectAll: 'Select all',
    openShell: 'Start internal terminal (then type the alias)',
    openWindow: 'Open external terminal',
    model: 'Model',
    unbound: 'unbound',
    thinking: 'Thinking',
    on: 'on',
    off: 'off',
    allow: 'Allowed tools',
    deny: 'Denied tools'
  },
  yaml: {
    reload: 'Reload',
    save: 'Save',
    unsaved: 'Unsaved changes',
    line: 'line',
    confirmReload: 'Discard unsaved changes and reload from disk?',
    saved: 'roles.yaml saved',
    saveFail: 'Save failed: {error}'
  },
  picker: {
    title: 'Start a new session',
    subtitle: 'Pick a role. Roles with no model are disabled.',
    cancel: 'Cancel',
    empty: 'No roles configured. Add one first.',
    noModel: '(no model)'
  },
  terminal: {
    emptyTitle: 'No active sessions',
    emptyHint: 'Click ▶ Start Selected Role, press Cmd+N (or Option+T) to launch.',
    close: 'Close tab',
    clone: 'Clone tab'
  },
  roleEdit: {
    title: 'Edit role "{name}"',
    label: 'Display label',
    model: 'Bound model',
    thinking: 'Enable extended thinking (MAX_THINKING_TOKENS=16000)',
    systemPrompt: 'System prompt file',
    systemPromptPh: 'absolute path or ~/... (or click 📁 to browse)',
    browse: 'Browse for a prompt file',
    allowedTools: 'Allowed tools (Read, LS, Glob, Grep…)',
    disallowedTools: 'Denied tools (Edit, Write, Bash…)',
    disallowedPlugins: 'Denied plugins (superpowers is always added)',
    cancel: 'Cancel',
    save: 'Save'
  },
  confirm: {
    resetTitle: 'Reset roles',
    resetMessage: 'Restore the default Plan + Worker roles? Your models and edited prompt files are kept.',
    reset: 'Reset',
    deleteRoleTitle: 'Delete role',
    deleteRoleMessage: 'Delete role "{id}"? This cannot be undone.',
    delete: 'Delete'
  },
  toast: {
    roleAdded: '➕ Role "{id}" added',
    roleSaved: '✅ Role saved',
    roleDeleted: '🗑️ Role deleted',
    roleDuplicated: '📋 Duplicated as "{id}"',
    roleReset: '♻️ Roles reset to defaults',
    addModelFirst: '💡 Add a model on the Models tab first',
    noRole: '🔴 Pick a role first',
    noModel: '🔴 Role has no model bound. Open Models and add one, then bind it.',
    tabOpenFail: '🔴 Failed to start terminal session',
    launchOk: '🖥️ External terminal opened',
    launchFail: '🔴 Failed to open terminal: {error}',
    duplicated: '📋 Duplicated as "{name}"',
    connected: '🟢 {name} · connected in {ms}ms (HTTP {status})',
    unreachable: '🔴 {name} · unreachable ({error})',
    testFailed: '🔴 {name} · test failed',
    scriptCopied: '📋 Launch script copied — paste into Terminal',
    copyFail: '🔴 Copy failed',
    noBoundRole: '💡 Bind a model to a role first'
  },
  models: {
    title: 'Configured Models',
    addTip: 'Add model',
    subtitle: 'Models are shared across every role.',
    hint: 'Roles can reference these by id.',
    empty: 'No models yet. Add one to enable roles.'
  },
  form: {
    addTitle: 'Add Model',
    editTitle: 'Edit Model',
    displayName: 'Display Name',
    displayNamePh: 'e.g. GLM-5.3',
    baseUrl: 'Base URL',
    baseUrlPh: 'https://… (type or pick a preset)',
    apiKey: 'API Key',
    apiKeyPh: 'sk-...',
    modelId: 'Model ID',
    modelIdPh: 'glm-5.3',
    cancel: 'Cancel',
    submitAdd: 'Add Model',
    submitEdit: 'Save Changes',
    validation: 'Please fill in Name, Base URL and API Key'
  },
  card: {
    model: 'Model',
    edit: 'Edit',
    duplicate: 'Duplicate',
    test: 'Test connection',
    testing: 'Testing…',
    delete: 'Delete'
  },
  modal: {
    deleteTitle: 'Delete model',
    deleteMessage: "Delete '{name}'? This cannot be undone.",
    delete: 'Delete',
    cancel: 'Cancel'
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    langEn: 'English',
    langZh: '中文',
    terminal: 'External Terminal',
    terminalHint: 'Used by "Open in external terminal"',
    choose: 'Choose…',
    notSet: 'Not set',
    about: 'About',
    version: 'Version',
    roles: 'Roles',
    resetRoles: 'Reset Roles',
    resetTip: 'Restore default Plan + Worker (keeps models and edited prompt files)'
  }
}