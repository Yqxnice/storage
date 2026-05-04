# 应用自动更新指南 (GitHub Actions)

## 概述

本项目使用 GitHub Actions 实现自动化构建和发布，支持 NSIS/MSI 安装包的自动更新。

## 配置步骤

### 1. 生成签名密钥

在本地项目目录执行：

```powershell
cd src-tauri
npx tauri signer generate
```

生成的公钥和私钥信息类似：

```
公钥: dGhpcyBpcyBhIHNhbXBsZSBwdWJsaWMga2V5IGZvciB0ZXN0aW5n...
私钥: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRREdBSVV...
```

### 2. 添加 GitHub Secrets

在 GitHub 仓库的 `Settings > Secrets and variables > Actions` 中添加：

| Secret Name | 值 |
|-------------|-----|
| `TAURI_SIGNING_PRIVATE_KEY` | 私钥内容（包含 -----BEGIN RSA PRIVATE KEY----- 到 -----END RSA PRIVATE KEY-----） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成密钥时设置的密码 |

### 3. 更新 tauri.conf.json

将生成的公钥添加到 `plugins.updater.pubkey`：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/Yqxnice/storage/releases/latest/download/latest.json"
      ],
      "pubkey": "dGhpcyBpcyBhIHNhbXBsZSBwdWJsaWMga2V5IGZvciB0ZXN0aW5n..."
    }
  }
}
```

### 4. 提交并推送

```bash
git add .
git commit -m "feat: 配置自动更新"
git push
```

## 发布新版本

### 发布流程

1. **更新版本号**
   - 修改 `package.json` 中的 `version` (例如: 1.0.0 → 1.1.0)
   - 修改 `src-tauri/Cargo.toml` 中的 `version`
   - 修改 `src-tauri/tauri.conf.json` 中的 `version`

2. **创建 Git Tag**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

3. **GitHub Actions 自动构建**
   - 检测到 tag 后自动触发构建
   - 自动签名安装包
   - 自动生成 `latest.json`
   - 自动创建 GitHub Release

4. **验证 Release**
   - 访问 https://github.com/Yqxnice/storage/releases
   - 确认新版本已发布
   - 确认包含 `.exe`、`.msi` 和 `latest.json` 文件

## latest.json 文件格式

自动生成的 `latest.json` 结构：

```json
{
  "version": "1.1.0",
  "notes": "版本 1.1.0 更新",
  "pub_date": "2024-05-04T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "GCIa.....",
      "url": "https://github.com/Yqxnice/storage/releases/download/v1.1.0/storage_1.1.0_x64-setup.exe"
    }
  }
}
```

## 注意事项

1. **签名密钥安全**
   - 私钥绝不能泄露或提交到代码库
   - 只将私钥添加到 GitHub Secrets

2. **版本号规范**
   - 必须遵循 semver 语义化版本
   - Tag 必须以 `v` 开头 (如 `v1.0.0`)

3. **更新日志**
   - 建议在 GitHub Release 的说明中填写详细更新内容
   - 这个内容会显示在应用的更新弹窗中

4. **测试更新**
   - 先使用 `workflow_dispatch` 测试构建流程
   - 确认构建成功后，再推送 tag

## 常见问题

### Q: 构建失败，显示签名错误
A: 检查 GitHub Secrets 中的私钥和密码是否正确

### Q: latest.json 未正确生成
A: 确认 workflow 中的签名步骤是否成功执行

### Q: 更新检测失败
A: 确认 `tauri.conf.json` 中的 `pubkey` 与签名私钥配对

### Q: 下载的安装包签名验证失败
A: 确保 GitHub Actions 中签名和 latest.json 使用的是同一套密钥
