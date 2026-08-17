import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'CC Mode Switcher',
  description: 'Claude Code Plan / Work dual-mode environment switcher',

  // Project page lives at https://<owner>.github.io/<repo>/, so all generated
  // absolute URLs (/, /zh/, /guide/, /zh/guide/) get prefixed with this base.
  // For local dev `pnpm docs:dev` serves at http://localhost:5173/cc-mode-switcher/.
  base: '/cc-mode-switcher/',

  // English is the site root (default); Chinese under /zh/
  // Source layout mirrors URLs directly: docs/ ↔ /, docs/guide/ ↔ /guide/,
  // docs/zh/ ↔ /zh/, docs/zh/guide/ ↔ /zh/guide/ — no rewrites needed.
  //
  // 📑 When adding a new chapter under docs/guide/ or docs/zh/guide/:
  //    1. Create the .md file
  //    2. Add a row to the table in docs/index.md and docs/zh/index.md
  //    3. Add the entry to the appropriate sidebar group below.
  //       VitePress does NOT auto-discover pages — sidebar and nav are
  //       explicit lists.
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Download', link: '/download' },
          { text: 'Index', link: '/' },
          { text: 'Guide', link: '/guide/01-getting-started' },
          { text: 'Playbooks', link: '/guide/03-plan-mode-playbook' },
          { text: 'Example', link: '/guide/05-workflow-example' }
        ],
        sidebar: {
          // Home page — section header itself acts as the link to / (no duplicated inner item).
          '/': [
            {
              text: 'Index',
              link: '/'
            },
            {
              text: '⬇️ Download',
              link: '/download'
            },
            {
              text: 'Guide',
              items: [
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
            },
            {
              text: 'Project Management',
              items: [
                { text: '06 · Local Build', link: '/guide/06-local-build' },
                { text: '07 · Release & Versioning', link: '/guide/07-release-versioning' }
              ]
            }
          ],
          // Guide subpages — top entry is a back link to the index.
          '/guide/': [
            {
              text: '← Index',
              link: '/'
            },
            {
              text: '⬇️ Download',
              link: '/download'
            },
            {
              text: 'Guide',
              items: [
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
            },
            {
              text: 'Project Management',
              items: [
                { text: '06 · Local Build', link: '/guide/06-local-build' },
                { text: '07 · Release & Versioning', link: '/guide/07-release-versioning' }
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
          { text: '下载', link: '/zh/download' },
          { text: '文档索引', link: '/zh/' },
          { text: '使用指南', link: '/zh/guide/01-getting-started' },
          { text: '实战案例', link: '/zh/guide/03-plan-mode-playbook' }
        ],
        sidebar: {
          '/zh/': [
            // Section header itself acts as the link to /zh/ — no duplicated inner item.
            {
              text: '文档索引',
              link: '/zh/'
            },
            {
              text: '⬇️ 下载',
              link: '/zh/download'
            },
            {
              text: '使用指南',
              items: [
                { text: '01 · 快速上手', link: '/zh/guide/01-getting-started' },
                { text: '02 · 模型与 Provider 配置', link: '/zh/guide/02-models-and-providers' }
              ]
            },
            {
              text: '实战案例',
              items: [
                { text: '03 · Plan 模式实战', link: '/zh/guide/03-plan-mode-playbook' },
                { text: '04 · Work 模式实战', link: '/zh/guide/04-work-mode-playbook' },
                { text: '05 · 端到端示例', link: '/zh/guide/05-workflow-example' }
              ]
            },
            {
              text: '项目管理',
              items: [
                { text: '06 · 本地构建', link: '/zh/guide/06-local-build' },
                { text: '07 · 发布与版本管理', link: '/zh/guide/07-release-versioning' }
              ]
            }
          ],
          '/zh/guide/': [
            {
              text: '← 文档索引',
              link: '/zh/'
            },
            {
              text: '⬇️ 下载',
              link: '/zh/download'
            },
            {
              text: '使用指南',
              items: [
                { text: '01 · 快速上手', link: '/zh/guide/01-getting-started' },
                { text: '02 · 模型与 Provider 配置', link: '/zh/guide/02-models-and-providers' }
              ]
            },
            {
              text: '实战案例',
              items: [
                { text: '03 · Plan 模式实战', link: '/zh/guide/03-plan-mode-playbook' },
                { text: '04 · Work 模式实战', link: '/zh/guide/04-work-mode-playbook' },
                { text: '05 · 端到端示例', link: '/zh/guide/05-workflow-example' }
              ]
            },
            {
              text: '项目管理',
              items: [
                { text: '06 · 本地构建', link: '/zh/guide/06-local-build' },
                { text: '07 · 发布与版本管理', link: '/zh/guide/07-release-versioning' }
              ]
            }
          ]
        },
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题'
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
