import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'CC Mode Switcher',
  description: 'Claude Code Plan / Work dual-mode environment switcher',

  // English is the site root (default); Chinese lives under /guide/zh/
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/01-getting-started' },
          { text: 'Playbooks', link: '/guide/03-plan-mode-playbook' },
          { text: 'Example', link: '/guide/05-workflow-example' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Index', link: '/' },
                { text: '01 · Quick Start', link: '/guide/01-getting-started' },
                { text: '02 · Models & Providers', link: '/guide/02-models-and-providers' }
              ]
            },
            {
              text: 'Playbooks',
              items: [
                { text: '03 · Plan Mode Playbook', link: '/guide/03-plan-mode-playbook' },
                { text: '04 · Work Mode Playbook', link: '/guide/04-work-mode-playbook' },
                { text: '05 · End-to-End Example', link: '/guide/05-workflow-example' }
              ]
            }
          ]
        }
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '使用指南', link: '/guide/zh/01-getting-started' },
          { text: '实战方法论', link: '/guide/zh/03-plan-mode-playbook' },
          { text: '端到端示例', link: '/guide/zh/05-workflow-example' }
        ],
        sidebar: {
          '/guide/zh/': [
            {
              text: '使用指南',
              items: [
                { text: '文档索引', link: '/guide/zh/' },
                { text: '01 · 快速上手', link: '/guide/zh/01-getting-started' },
                { text: '02 · 模型与 Provider 配置', link: '/guide/zh/02-models-and-providers' }
              ]
            },
            {
              text: '实战方法论',
              items: [
                { text: '03 · Plan 模式实战', link: '/guide/zh/03-plan-mode-playbook' },
                { text: '04 · Work 模式实战', link: '/guide/zh/04-work-mode-playbook' },
                { text: '05 · 端到端示例', link: '/guide/zh/05-workflow-example' }
              ]
            }
          ]
        },
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式'
      }
    }
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    socialLinks: [
      { icon: 'github', link: 'https://github.com/leochan007/cc-mode-switcher' }
    ],
    search: {
      provider: 'local'
    }
  }
})
