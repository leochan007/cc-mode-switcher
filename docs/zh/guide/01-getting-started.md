# 01 · 快速上手

> 环境要求(Node / pnpm 版本、国内镜像加速)见项目根目录 `README.zh-CN.md`,本文从安装完成后讲起。

## 工作台一览

打开应用,默认停在 **Switcher** Tab。两栏布局:

```
┌────── Toolbar: 📂 cwd · ▶ 启动选中角色 · ➕ 新增角色 · 🤖 模型 · ♻️ 重置 · ⚙️ ─┐
├──────── 左栏 ────────┬──────── 右栏:终端 Tab ────────┤
│ ┌ 角色表格 ────────┐  │ ┌ Plan ─┬ Worker ─┬ + ┐                    │
│ │ id │ model │ think│  │ │                                       │
│ └─────────────────┘  │ │  xterm.js (一个 Tab = 一个 pty)        │
│ ┌ 启动面板 ───────┐  │ │                                       │
│ │ (选中角色的      │  │ └───────────────────────────────────────┘
│ │  完整 cc-<角色>) │  │  空态:"点 ▶ 或按 Cmd+N 启动"             │
│ └─────────────────┘  │                                           
└──────────────────────┴────────────────────────────────────────────┘
```

- **左栏** —— 上方是**角色表格**,下方是**启动面板**(只在 Table 视图;YAML 视图替换两者为一个 textarea)。
- **右栏** —— 终端 **Tab**。一个 Tab = 一个跑着的 shell 会话。新 Tab 通过点 ▶、`Cmd+T`、`Cmd+N`、`Option+T` 在这里开。
- **Toolbar** —— 选工作目录、启动选中角色、跳到模型、重置角色到默认、或打开设置。

## 五步首次设置

### 第 1 步:添加模型

1. 打开 **🤖 模型** Tab(右上角)。
2. 点击右上角的 ➕。
3. 输入 **Display Name** 或 **Model ID**(如 `GLM-5.3`、`Claude-Opus-4.8`)—— **Base URL** 按关键字自动填。
4. 或者点 Base URL 字段,从预设下拉里选(GLM / Claude / DeepSeek / Kimi / Z.ai / Qwen)。
5. 填 **API Key**;一旦 provider 匹配,点 **model ID chips** 一键填 Model ID。
6. **添加模型**。

![模型管理](/images/model_config.png)

按你要的角色(Plan 用推理模型,Worker 用快便宜模型,加上任何自定义角色)添加模型即可。详见 [02 · 模型与 Provider 配置](02-models-and-providers.md)。

### 第 2 步:测试连接

点模型卡上的 📡:

- 🟢 绿 toast:`connected in 143ms (HTTP 200)` → 端点可达
- 🔴 红 toast:`unreachable (ENOTFOUND / timeout)` → 检查 URL / 网络

> 任何 HTTP 状态码(包括 404/401)都算"可达" —— DNS/TLS/链路都没问题;真正的鉴权发生在 POST 时。

### 第 3 步:绑定角色

角色出厂预置两个 —— `Plan`(只读,thinking on)和 `Worker`(可写,thinking off)。打开 **🔄 Switcher** Tab,在角色表格里能看到。

为每个角色绑定模型:

- **单元格直接编辑**:点 Model 列单元格 → 下拉(数据源是 `models.yaml`)。
- 或者点行选中 → ✏️ Edit → 在弹窗里选模型。

![Switcher 工作台](/images/switcher_main.png)

按 ➕ 加角色,🗑️ 删角色,右键复制/粘贴/删除。详见 [02 · 模型与 Provider 配置](02-models-and-providers.md#磁盘上的-models--roles-配置) 看底层 YAML 格式,以及 [角色 Playbook](03-roles-playbook.md) 看设计思想。

### 第 4 步:配置系统提示词(可选)

每个角色从你指定的文件路径读提示词。出厂默认在:

```
~/.cc-mode-switcher/prompts/Plan.md
~/.cc-mode-switcher/prompts/Worker.md
```

可以直接编辑这些文件,也可用 ✏️ Edit → **System prompt file** 字段指向别的文件(或者按 📁 浏览),或者 **⚙️ 设置 → 重置角色**(只重置 `roles.yaml`,**不覆盖**你的提示词文件)。

### 第 5 步:选终端 + 启动

#### 选外部终端(一次性)

**⚙️ 设置 → 外部终端**,点 **Choose…** 选你的 `.app`:

- `/System/Applications/Utilities/Terminal.app`(默认)
- `/Applications/iTerm.app`
- 任何其他处理 `.command` 的 `.app`

![设置](/images/system_settings.png)

#### 启动第一个会话

点 toolbar 的 **▶ 启动选中角色**(或启动面板里的 **▶ Open in Terminal**):

1. 应用写 `~/.cc-mode-switcher/.launch-cache/launch.sh` —— 一份生成的脚本,定义 `cc-<角色>()` 函数和每角色 settings。
2. 右栏新开一个 **内部 xterm Tab**(外部则新开 Terminal.app 窗口)。bootstrap 自动被 source。
3. 你会看到:
   ```
   ✓ launch.sh:  /Users/<你>/.cc-mode-switcher/.launch-cache/launch.sh
   ✓ available:  cc-plan
   ```
4. 敲 alias 用对应角色启动 Claude:

| 选中角色 | 终端里敲 | 效果 |
| --- | --- | --- |
| `Plan` | `cc-plan` | `claude` 跑该角色模型,extended thinking,**只读**工具白名单,`--disallowed-plugins superpowers` |
| `Worker` | `cc-worker` | `claude` 跑该角色模型,写/编辑/测试工具,`--disallowed-plugins superpowers` |
| 任何自定义角色 | `cc-<id-小写>` | 你配置的 prompt + 工具策略 |

> 流程中切换角色:在表格里选另一个角色,再点 ▶ 开新 Tab。旧 Tab 保持原绑定(参数在会话创建时已快照)。

## 常用操作

| 操作 | 位置 |
| --- | --- |
| 拖拽重排角色 | 每行左侧的 ⠿ 把手 |
| 单元格编辑 model / thinking | 在表格里点单元格 |
| 编辑角色完整配置 | 行内 ✏️(或双击行) |
| 添加角色 | 表格头 ➕ |
| 复制 / 删除角色 | 右键行 |
| 表格 / YAML 视图切换 | 表格头的视图切换 |
| 重置角色到默认 | ⚙️ 设置 → 重置角色 |
| 主题 / 语言 | 标题栏右上角快捷切换 |
| 用选中角色开新 Tab | ▶ 启动选中角色,或 `Option+T` |
| 克隆当前 Tab | `Cmd+T`(xterm 焦点下) |
| 选角色开新 Tab | `Cmd+N`(xterm 焦点下) |
| Tab 分离成独立窗口 | 右键 Tab → Detach |

## 数据存在哪里

所有配置持久化在 `~/.cc-mode-switcher/`:

```
~/.cc-mode-switcher/
├── models.yaml         ← 每个模型一条(连接信息)
├── roles.yaml          ← 每个角色一条(label, model, thinking, prompt, tools)
├── prompts/
│   ├──Plan.md         ← 出厂默认;随便编辑;Reset 不会覆盖
│   └──Worker.md
└── .launch-cache/      ← 每会话的 launch.sh + settings.json;1 天后自动清理
```

`models.yaml` 和 `roles.yaml` 是纯 YAML —— 喜欢手编可以直接改,或者在 app 里改,同一个文件会被更新。首次运行会把 v1 `localStorage` 里的模型数据**一次性**迁到 `models.yaml`。

下一步:读 [02 · 模型与 Provider 配置](02-models-and-providers.md) 看磁盘格式,以及 [角色 Playbook](03-roles-playbook.md) 看设计思想。