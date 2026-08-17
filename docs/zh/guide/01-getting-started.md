# 01 · 快速上手

> 环境要求（Node/pnpm 版本、国内镜像加速）见项目根目录 `README.zh-CN.md`，本文从安装完成后讲起。

## 五步完成首次配置

### 第 1 步：添加模型

1. 打开 **🤖 Models** 标签页，点右上角 ➕
2. 输入 **Display Name** 或 **Model ID**（如 `glm-5.3`、`MiniMax-M3`）——Base URL 会按关键词**自动填入**
3. 也可以点 Base URL 输入框，从预设下拉里直接选（GLM / MiniMax / DeepSeek / Kimi / Z.ai / Qwen）
4. 填入 **API Key**；匹配到 Provider 后点击下方 **模型 ID chips** 快速填入 Model ID
5. Save 保存

![模型管理](/images/model_config.png)

建议至少添加两个模型：一个给 Plan（推理强）、一个给 Work（快/便宜），见 [02 章 · 模型分工建议](02-models-and-providers.md#模型分工建议)。

### 第 2 步：测试连接

模型卡片上点 📡：
- 🟢 绿色 toast：`连接成功 143ms（HTTP 200）` → 端点可用
- 🔴 红色 toast：`无法连接（ENOTFOUND / timeout）` → 检查 URL / 网络

> 任何 HTTP 状态码（包括 404/401）都视为"可达"——说明 DNS/TLS/链路通，真正的调用走 POST 接口。

### 第 3 步：绑定模式

切换到 **🔄 Switcher** 标签页，在 **Mode Binding** 中：
- **Plan uses model** → 选推理模型
- **Work uses model** → 选执行模型

两张模式卡片会显示各自绑定的模型徽章。

![Plan/Work 切换器](/images/switcher_main.png)

### 第 4 步：选择终端

点命令区的 ▶️（首次会弹出文件选择器）：
- **Terminal.app**：选 `/System/Applications/Utilities/Terminal.app`
- **iTerm**：选 iTerm.app
- 其他终端也可选，会以生成 `.command` 脚本的方式回退支持

之后可随时在 **⚙️ Settings → Terminal** 里修改。

![设置](/images/system_settings.png)

### 第 5 步：打开终端开始干活

点 ▶️ **Open in terminal**：
1. 应用会在 `$CC_MODE_DIR/<ModelName>.json` 写一个临时 settings 文件，并定义当前选中模式的 alias —— Plan → `cc-p`，Work → `cc-w`。不写 `~/.claude/settings.json`，也不写 `~/.zshrc`。
2. 新终端窗口打开后看到 `✅ ready — type cc-p for plan, cc-w for work`。
3. 输入 alias 开始会话：

| 当前选中模式 | 终端里运行 | 效果 |
| --- | --- | --- |
| Plan | `cc-p` | `claude --permission-mode plan` + thinking 开启（通过 `--settings "$CC_MODE_DIR/<ModelName>.json"` 加载） |
| Work | `cc-w` | 默认权限，正常执行（通过 `--settings "$CC_MODE_DIR/<ModelName>.json"` 加载） |

> 切换模式：回到应用点另一张模式卡片，再点一次 ▶️ 开新终端窗口（旧终端 env 不受影响，可同时保留两个模式的终端）。

## 常用操作速查

| 操作 | 位置 |
| --- | --- |
| 拖拽调整模型顺序 | Models 页卡片左侧 ⠿ 把手 |
| 编辑模型 | 卡片 ✏️ |
| 复制一份配置 | 卡片 📋（副本自动命名 `X copy`、`X copy (1)`…） |
| 删除模型 | 卡片 🗑️ → 弹窗二次确认 |
| 中英文 / 深浅色切换 | 右上角快捷按钮或 Settings 页 |

下一步：阅读 [03 · Plan 模式实战](03-plan-mode-playbook.md) 和 [04 · Work 模式实战](04-work-mode-playbook.md)。
