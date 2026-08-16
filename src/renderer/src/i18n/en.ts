export default {
  app: {
    title: 'CC Mode Switcher',
    subtitle: 'Plan / Work dual-mode environment switcher for Claude Code'
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
  models: {
    title: 'Configured Models',
    addTip: 'Add model',
    empty: 'No models configured yet. Click the button above to add one.'
  },
  form: {
    addTitle: 'Add Model',
    editTitle: 'Edit Model',
    displayName: 'Display Name',
    displayNamePh: 'e.g. GLM-5.2',
    baseUrl: 'Base URL',
    baseUrlPh: 'https://… (type or pick a preset)',
    apiKey: 'API Key',
    apiKeyPh: 'sk-...',
    modelId: 'Model ID',
    modelIdPh: 'glm-5.2',
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
  toast: {
    connected: '🟢 {name} · connected in {ms}ms (HTTP {status})',
    unreachable: '🔴 {name} · unreachable ({error})',
    testFailed: '🔴 {name} · test failed',
    duplicated: '📋 Duplicated as "{name}"'
  },
  modal: {
    deleteTitle: 'Delete model',
    deleteMessage: "Delete '{name}'? This cannot be undone.",
    delete: 'Delete',
    cancel: 'Cancel'
  },
  switcher: {
    planTitle: 'Plan Mode',
    planDesc: 'Architecture analysis / Design / Code review',
    workTitle: 'Work Mode',
    workDesc: 'Implementation / Debug / File operations',
    noModel: '⚠️ No model bound',
    binding: 'Mode Binding',
    planUses: 'Plan uses model',
    workUses: 'Work uses model',
    select: 'Select...',
    cliTitle: 'CLI Launch Command',
    cliHint: '(copy and paste into terminal)',
    copy: 'Copy command',
    copied: 'Copied!',
    tip: '💡 Open in terminal or paste into your shell; run claude-plan for Plan, plain claude for Work',
    modePlan: 'Plan (analysis/design)',
    modeWork: 'Work (coding/execution)',
    needModel: '# Please add a model in "Models" tab and bind it in "Switcher" tab first',
    launch: 'Open in terminal',
    launchNoModel: '🔴 Please bind a model first',
    launchOk: '🖥️ Terminal opened — env ready',
    launchFail: '🔴 Failed to open terminal: {error}'
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
    terminal: 'Terminal',
    terminalHint: 'Used by "Open in terminal"',
    choose: 'Choose…',
    notSet: 'Not set',
    about: 'About',
    version: 'Version'
  }
}
