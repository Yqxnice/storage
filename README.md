# 桌面收纳 (Storage)

[![GitHub Release](https://img.shields.io/github/v/release/Yqxnice/storage?style=flat-square)](https://github.com/Yqxnice/storage/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue?style=flat-square)]()

一个基于 Tauri + React 的桌面文件收纳工具，帮助你整理和管理桌面文件。

## 下载

### 最新版本

| 类型 | 文件 | 说明 |
|------|------|------|
| 便携版 | `*.exe` | 无需安装，直接运行 |
| 安装包 | `*.msi` | Windows 安装程序 |

📥 **[前往 GitHub Releases 下载](https://github.com/Yqxnice/storage/releases)**

## 技术栈

- **框架**: Tauri v2 + React 18 + TypeScript
- **构建工具**: Vite 5
- **状态管理**: Zustand
- **UI**: 自定义组件，支持多主题（blue, green, purple, orange, pink, cyan, dark）

## 功能特性

- 📦 收纳盒管理：创建、删除、重命名收纳盒，拖拽排序
- 📄 文件收纳：拖放文件/文件夹到收纳盒，支持桌面文件扫描
- 🔗 网页链接：添加和管理网页链接
- 🎨 主题切换：支持 7 种主题色，可启用时间主题自动切换日/夜模式
- ⌨️ 全局快捷键：支持自定义全局快捷键（默认 Ctrl+Shift+Space）
- 💾 自动备份：多种备份间隔选项，支持数据恢复
- 🖼️ 悬浮窗：收纳盒支持悬浮窗模式
- 🌐 多语言 UI：中文界面

## 开发

### 前置要求

- Node.js >= 18
- Rust 和 Cargo（Tauri 开发环境）
- Windows: Microsoft Visual Studio C++ 生成工具

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

该命令会：
1. 运行 `close-ports.js` 释放端口 3000
2. 启动 Vite 开发服务器（端口 3000）
3. 启动 Tauri 应用

### 构建

```bash
npm run tauri:build
```

构建产物在 `src-tauri/target/release/bundle` 目录。

## 版本发布

### 版本号规则

遵循语义化版本 (Semantic Versioning)：
- `major.minor.patch` (如 `1.2.3`)
- major: 不兼容的 API 变更
- minor: 向后兼容的功能新增
- patch: 向后兼容的 Bug 修复

### 发布命令

```bash
# Patch 版本 (Bug 修复)
npm run release:patch

# Minor 版本 (新功能)
npm run release:minor

# Major 版本 (破坏性变更)
npm run release:major
```

### 发布流程

推送 `v*` 标签即可触发 GitHub Actions 自动构建和发布：

```bash
# 1. 更新版本号
npm run release:patch  # 或 minor、major

# 2. 提交并推送
git add .
git commit -m "chore: release v1.2.0"
git push

# 3. 创建标签并推送
git tag v1.2.0
git push origin v1.2.0
```

GitHub Actions 会自动构建并创建 Release。

## 项目结构

```
storage/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── common/        # 通用组件（Button, Modal, etc.）
│   │   ├── home/          # 首页组件
│   │   ├── modal/         # 模态框组件
│   │   └── Settings/      # 设置页面组件
│   ├── page/             # 页面组件
│   ├── utils/            # 工具函数
│   │   ├── tauri-ipc.ts  # Tauri IPC 通信封装
│   │   ├── box-float-*.ts # 悬浮窗相关工具
│   │   └── theme.ts      # 主题工具
│   ├── store.ts          # Zustand 状态管理
│   ├── App.tsx           # 主应用组件
│   └── main.tsx          # 入口文件
├── src-tauri/            # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs      # 入口
│   │   └── lib.rs        # 主逻辑（commands, events, IPC）
│   └── tauri.conf.json  # Tauri 配置
├── .github/workflows/    # GitHub Actions 配置
├── version.js           # 版本管理脚本
├── commitlint.config.js # Git 提交规范
├── UPDATER_GUIDE.md     # 自动更新配置和发布指南
└── vite.config.ts        # Vite 配置（多入口）
```

## 配置说明

### Tauri 配置

- 主窗口：800x600，最小 600x400，无边框（decorations: false）
- 开发 URL：`http://localhost:3000`
- 生产加载：`dist/index.html`
- CSP 已配置，允许 IPC 和本地开发服务器连接

### 存储

- 使用 Tauri Store 插件持久化数据
- 收纳盒数据存储在 `storage` store
- 设置数据存储在 `settings` store
- 支持便携模式（数据存储在应用目录）

### 快捷键

默认全局快捷键：`Ctrl+Shift+Space` 显示/隐藏应用

## 常见问题

### 端口被占用

运行 `node close-ports.js` 释放端口 3000。

### 拖放文件无响应

确保系统允许应用接收拖放，检查 `tauri.conf.json` 中 `dragDropEnabled: true`。

## 许可证

MIT
