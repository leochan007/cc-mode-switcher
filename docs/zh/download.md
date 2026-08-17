# ⬇️ 下载

[English](/download) | **简体中文**

**macOS / Windows / Linux** 安装包发布在 GitHub Releases：

> ### 👉 [最新版本 — github.com/leochan007/cc-mode-switcher/releases/latest](https://github.com/leochan007/cc-mode-switcher/releases/latest)

只有当**三个系统**的构建全部上传成功后，Release 才会对外发布，因此每个已发布的版本都包含完整的安装包。

## 选择对应文件

| 系统 | 文件 | 说明 |
| --- | --- | --- |
| macOS（Apple Silicon） | `.dmg` | arm64 构建，适配 M1/M2/M3/M4 芯片。macOS 12+ |
| Windows 10/11 | `.exe` | NSIS 安装器（64 位） |
| Linux | `.AppImage` | x86-64，免安装，下载即可运行 |

历史版本：查看[全部 Releases](https://github.com/leochan007/cc-mode-switcher/releases)。

## 安装说明

### macOS

1. 打开 `.dmg`，把 **CC Mode Switcher** 拖入 `Applications`。
2. 应用**未做代码签名**（没有 Apple 开发者证书），首次启动会被 Gatekeeper
   拦截：**右键点击应用 → 打开 → 打开**（只需一次，之后 macOS 会记住选择）。

### Windows

1. 运行 `.exe`，按 NSIS 向导完成安装。
2. 未签名应用首次运行会弹出 SmartScreen：**更多信息 → 仍要运行**。

### Linux

```bash
chmod +x 'CC Mode Switcher-*.AppImage'
./'CC Mode Switcher-*.AppImage'
```

如果无法启动，请安装 `libfuse2`（AppImage 依赖）：`sudo apt install libfuse2`。

## 各平台功能差异

完整 UI（模型管理、模式绑定、设置）在所有系统上均可使用；
**「在终端中打开」目前仅支持 macOS**（通过 AppleScript 和 `.command` 文件驱动 Terminal.app / iTerm）。

---

初次使用？先看 [00 · 产品介绍](/zh/guide/00-introduction) 了解功能与设计理念，再看 [01 · 快速上手](/zh/guide/01-getting-started) 五步完成首次配置。
