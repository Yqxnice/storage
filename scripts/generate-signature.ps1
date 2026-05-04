# PowerShell script to generate updater signatures
# Run this in your project root directory

Write-Host "Tauri Updater 签名生成工具" -ForegroundColor Cyan
Write-Host ""

# Check if tauri CLI is available
$tauriCmd = Get-Command "npx" -ErrorAction SilentlyContinue
if (-not $tauriCmd) {
    Write-Host "错误: 未找到 npx，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "正在生成密钥对..." -ForegroundColor Yellow
Write-Host ""
Write-Host "请输入用于签名更新的密码。请记住这个密码！" -ForegroundColor Magenta
Write-Host ""

# Generate keys
cd src-tauri
npx tauri signer generate --write-keys --force

Write-Host ""
Write-Host "密钥已生成！" -ForegroundColor Green
Write-Host ""
Write-Host "公钥已自动添加到 tauri.conf.json 中" -ForegroundColor Green
Write-Host ""
Write-Host "使用方法:" -ForegroundColor Cyan
Write-Host "  构建项目时，签名密钥会自动用于签名更新" -ForegroundColor Gray
Write-Host "  或者手动签名: npx tauri signer sign <update-file>" -ForegroundColor Gray
Write-Host ""
Write-Host "有关详细信息，请访问: https://tauri.app/v1/guides/distribution/updater" -ForegroundColor Gray
