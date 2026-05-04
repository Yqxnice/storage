# 应用自动更新指南 (GitHub Actions)

## 概述

本项目使用 **GitHub Actions + Tauri Updater 插件** 实现自动化构建和发布流程，支持 NSIS/MSI 安装包的自动更新。

---

## 目录

1. [工作原理](#1-工作原理)
2. [首次配置步骤](#2-首次配置步骤)
3. [发布新版本流程](#3-发布新版本流程)
4. [最新.json 文件格式](#4-latestjson-文件格式)
5. [注意事项](#5-注意事项)
6. [常见问题](#6-常见问题)

---

## 1. 工作原理

### 完整工作流

```
┌───────────────────┐
│  开发者推送 tag  │
│  (例如: v1.1.0) │
└───────────────────┘
         ↓
┌─────────────────────────────────┐
│  GitHub Actions 自动触发        │
│  (workflow: release.yml)         │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  1. Checkout 代码                            │
│  2. 设置 Node.js & Rust 环境                 │
│  3. 安装 npm 依赖                             │
│  4. 构建 Tauri 应用 (npm run tauri:build)    │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  5. 生成签名 (使用 GitHub Secrets 中的密钥)   │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  6. 创建 latest.json (包含版本信息和签名)     │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  7. 上传构建产物 (artifacts)                 │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  8. 下载 artifacts (release job)             │
│  9. 创建 GitHub Release                     │
│  10. 上传安装包和 latest.json                │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  用户端:                                    │
│  1. 点击"检查更新"                         │
│  2. App 下载 latest.json                    │
│  3. 验证签名并比较版本                       │
│  4. 如果有新版本，提示下载安装               │
└─────────────────────────────────────────────┘
```

---

## 2. 首次配置步骤

### 2.1 生成签名密钥

在本地项目目录执行（仅需执行一次）：

```powershell
cd src-tauri
npx tauri signer generate
```

生成后会输出类似这样的信息：

```
请输入密码保护私钥: ****
请再次输入密码: ****

生成密钥成功!

公钥: dGhpcyBpcyBhIHNhbXBsZSBwdWJsaWMga2V5IGZvciB0ZXN0aW5n...

私钥已加密保存，完整内容如下:
dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQ...
```

**请妥善保存这些信息！**

---

### 2.2 添加 GitHub Secrets

去你的 GitHub 仓库页面：

```
https://github.com/Yqxnice/storage/settings/secrets/actions
```

点击 `New repository secret`，添加以下两个密钥：

| Secret Name | 值 |
|-------------|-----|
| `TAURI_SIGNING_PRIVATE_KEY` | 完整的私钥内容（从 -----BEGIN RSA PRIVATE KEY----- 到 -----END RSA PRIVATE KEY----- 都复制进去） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 你刚才设置的私钥密码 |

---

### 2.3 更新 tauri.conf.json

编辑 `src-tauri/tauri.conf.json`，更新 `plugins.updater` 部分：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/Yqxnice/storage/releases/latest/download/latest.json"
      ],
      "pubkey": "这里填你生成的公钥"
    }
  }
}
```

---

### 2.4 确保前端依赖已安装

确认 `package.json` 中有这些依赖（我们已经安装过了）：

```json
{
  "dependencies": {
    "@tauri-apps/plugin-updater": "^2.10.1",
    "@tauri-apps/plugin-process": "^2.3.1"
  }
}
```

---

### 2.5 提交并推送初始配置

```bash
git add .
git commit -m "feat: 配置自动更新"
git push
```

---

## 3. 发布新版本流程

### 3.1 发布流程图

```
本地开发 ──────────────────────────┐
                                  │
  ┌───────────────┐              │
  │ 写代码、改 bug │              │
  └───────┬───────┘              │
          ↓                      │
  ┌──────────────────┐          │
  │ 本地测试构建通过 │ ◄────────┘
  └───────────┬──────┘
              ↓
  ┌───────────────────────┐
  │ 1. 更新版本号         │
  │   - package.json     │
  │   - Cargo.toml       │
  │   - tauri.conf.json  │
  └─────────────┬─────────┘
                ↓
  ┌───────────────────────┐
  │ 2. 提交代码           │
  └─────────────┬─────────┘
                ↓
  ┌───────────────────────┐
  │ 3. 创建 Git Tag       │
  │    git tag v1.1.0    │
  └─────────────┬─────────┘
                ↓
  ┌───────────────────────┐
  │ 4. 推送代码和 Tag    │
  └─────────────┬─────────┘
                ↓
  ┌──────────────────────────────┐
  │ GitHub Actions 自动开始构建！ │
  └──────────────────────────────┘
```

---

### 3.2 详细步骤

#### 步骤 1: 更新版本号

**方法 A：使用脚本 (推荐)**

```bash
# Patch 版本 (修复bug)
npm run release:patch

# Minor 版本 (新增功能)
npm run release:minor

# Major 版本 (重大变更)
npm run release:major
```

**方法 B：手动更新**

如果你想手动更新，需要修改这三个文件：

| 文件 | 路径 | 修改内容 |
|-----|------|----------|
| 1 | `package.json` | `"version": "1.1.0"` |
| 2 | `src-tauri/Cargo.toml` | `version = "1.1.0"` |
| 3 | `src-tauri/tauri.conf.json` | `"version": "1.1.0"` |

---

#### 步骤 2: 提交代码

```bash
git add .
git commit -m "chore: release v1.1.0"
```

---

#### 步骤 3: 创建 Git Tag

```bash
git tag v1.1.0
```

**注意：Tag 必须以 `v` 开头！**

---

#### 步骤 4: 推送到 GitHub

```bash
# 先推送代码
git push

# 再推送 Tag
git push origin v1.1.0
```

---

#### 步骤 5: 等待 GitHub Actions 构建

去 Actions 页面查看：

```
https://github.com/Yqxnice/storage/actions
```

你会看到一个 workflow 正在运行，通常需要 5-10 分钟。

---

#### 步骤 6: 验证发布

构建成功后，去 Releases 页面：

```
https://github.com/Yqxnice/storage/releases
```

确认以下文件都存在：

- ✅ `storage_1.1.0_x64-setup.exe` (NSIS 安装包)
- ✅ `storage_1.1.0_x64-en-US.msi` (MSI 安装包)
- ✅ `latest.json`

---

## 4. latest.json 文件格式

`latest.json` 是 GitHub Actions 自动生成的，结构如下：

```json
{
  "version": "1.1.0",
  "notes": "版本 1.1.0 更新",
  "pub_date": "2024-05-04T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SGVsbG8gV29ybGQh...",
      "url": "https://github.com/Yqxnice/storage/releases/download/v1.1.0/storage_1.1.0_x64-setup.exe"
    }
  }
}
```

### 字段说明

| 字段 | 说明 |
|-----|------|
| `version` | 语义化版本号 |
| `notes` | 更新说明（目前是自动生成的简单文本） |
| `pub_date` | 发布时间 (UTC) |
| `platforms.windows-x86_64.signature` | 安装包签名 (base64) |
| `platforms.windows-x86_64.url` | 安装包下载地址 |

---

## 5. 注意事项

### 5.1 签名密钥安全

**⚠️ 重要！**

| 事项 | 说明 |
|-----|------|
| 私钥保管 | 私钥绝不能泄露或提交到 Git 仓库 |
| GitHub Secrets | 只在 GitHub Secrets 中使用私钥 |
| 丢失密钥 | 如果丢失私钥，需要重新生成，并且旧版本的签名都会失效 |

---

### 5.2 版本号规范

必须严格遵循语义化版本 (Semantic Versioning)：

```
major.minor.patch

例如：1.0.0 → 1.1.0 → 1.1.1
```

| 位 | 说明 | 什么时候修改 |
|----|------|-------------|
| major | 主版本号 | 不兼容的 API 变更 |
| minor | 次版本号 | 向后兼容的新功能 |
| patch | 补丁号 | 向后兼容的 Bug 修复 |

---

### 5.3 更新日志

建议在 GitHub Release 发布时填写详细的更新内容，这些内容会显示在应用的更新弹窗里。

示例：

```markdown
## v1.1.0 更新内容

### 新增功能
- ✨ 添加自动更新功能
- 🛡️ 优化备份机制（防抖+启动间隔）
- ⏹️ 禁用打包后 F5 刷新

### Bug 修复
- 🐛 修复 xxx 问题
- 🐛 修复 yyy 问题
```

---

## 6. 常见问题

---

### Q1: 构建失败，显示签名错误？

**可能原因：**
- GitHub Secrets 没配置
- 私钥内容复制不正确
- 私钥密码不匹配

**解决方法：**
1. 去仓库 Settings > Secrets 检查
2. 确保 `TAURI_SIGNING_PRIVATE_KEY` 完整复制（包括 -----BEGIN/END 部分）
3. 确保 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 与生成时一致

---

### Q2: latest.json 未正确生成？

**可能原因：**
- 签名步骤失败
- workflow 配置问题

**解决方法：**
1. 查看 Actions 的完整日志
2. 确认签名步骤执行成功
3. 检查 `steps.signature.outputs.signature` 是否正确输出

---

### Q3: 更新检测失败？

**可能原因：**
- `tauri.conf.json` 中的 `pubkey` 不正确
- latest.json URL 配置错误

**解决方法：**
1. 确认 pubkey 与生成时的公钥一致
2. 测试访问 `https://github.com/Yqxnice/storage/releases/latest/download/latest.json`
3. 检查 CSP 配置是否允许该域名

---

### Q4: 下载的安装包签名验证失败？

**可能原因：**
- 重新生成了密钥，但旧版本还在用旧 pubkey
- latest.json 中的签名与实际安装包不匹配

**解决方法：**
1. 确保一次发布使用同一套密钥
2. 如果换了密钥，版本号应该升级
3. 检查 Actions 工作流是否正确关联签名和 latest.json 生成

---

### Q5: 如何测试更新流程但不发布正式版？

**方法：使用 workflow_dispatch 测试**

1. 去 Actions 页面
2. 选择 `Build Release` workflow
3. 点击 `Run workflow` (不需要 tag)
4. 可以查看构建是否成功

---

## 附录

### 项目相关文件说明

| 文件 | 说明 |
|-----|------|
| `.github/workflows/release.yml` | 发布 CI（构建、签名、创建 Release） |
| `.github/workflows/ci.yml` | 普通 CI（lint、构建检查） |
| `src/utils/updater.ts` | 前端更新逻辑封装 |
| `src/components/Updater/index.tsx` | 更新弹窗组件 |
| `UPDATER_GUIDE.md` | 本文件！完整指南 |

---

### 获取帮助

如果还有问题：
1. 检查 Actions 日志
2. 查看 Tauri 官方文档：https://tauri.app/v2/guides/distribution/updater/

---

**文档版本:** v1.0
**最后更新:** 2024-05-04
