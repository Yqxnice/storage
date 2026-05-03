#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);

const CONFIG_FILES = {
  package: path.join(rootDir, 'package.json'),
  tauri: path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
  cargo: path.join(rootDir, 'src-tauri', 'Cargo.toml'),
  changelog: path.join(rootDir, 'CHANGELOG.md'),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function semverParse(version) {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function semverString(major, minor, patch) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = semverParse(currentVersion);
  switch (type) {
    case 'major': return semverString(major + 1, 0, 0);
    case 'minor': return semverString(major, minor + 1, 0);
    case 'patch': return semverString(major, minor, patch + 1);
    default: throw new Error(`Invalid bump type: ${type}`);
  }
}

function updatePackageJson(version) {
  const pkg = readJson(CONFIG_FILES.package);
  pkg.version = version;
  writeJson(CONFIG_FILES.package, pkg);
  console.log(`Updated package.json: ${pkg.version}`);
}

function updateTauriConf(version) {
  const config = readJson(CONFIG_FILES.tauri);
  config.productName = config.productName || 'Storage';
  config.version = version;
  config.bundle = config.bundle || {};
  config.bundle.shortDescription = config.bundle.shortDescription || '桌面文件收纳工具';
  config.bundle.longDescription = config.bundle.longDescription || '一个简洁高效的桌面文件收纳管理工具';
  config.bundle.category = config.bundle.category || 'Utility';
  config.bundle.publisher = config.bundle.publisher || 'Desktop Storage';
  writeJson(CONFIG_FILES.tauri, config);
  console.log(`Updated tauri.conf.json: ${config.version}`);
}

function updateCargoToml(version) {
  let content = fs.readFileSync(CONFIG_FILES.cargo, 'utf-8');
  content = content.replace(/^version\s*=\s*".*?"/m, `version = "${version}"`);
  content = content.replace(/^name\s*=\s*".*?"/m, 'name = "storage"');
  fs.writeFileSync(CONFIG_FILES.cargo, content);
  console.log(`Updated Cargo.toml: ${version}`);
}

function generateChangelog(version, changes) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0];

  const sections = changes.map(c => `  - ${c}`).join('\n');
  const entry = `# v${version} (${date} ${time})\n\n## Features\n${sections}\n\n---\n`;

  let changelog = '';
  if (fs.existsSync(CONFIG_FILES.changelog)) {
    changelog = fs.readFileSync(CONFIG_FILES.changelog, 'utf-8');
  }

  changelog = entry + changelog;
  fs.writeFileSync(CONFIG_FILES.changelog, changelog);
  console.log(`Generated CHANGELOG.md for v${version}`);
}

function getCurrentVersion() {
  try {
    const pkg = readJson(CONFIG_FILES.package);
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function showHelp() {
  console.log(`
版本管理工具 - 桌面收纳盒项目

用法: node version.js <命令> [选项]

命令:
  get                  显示当前版本号
  bump <type>          升级版本号
                       type: patch | minor | major
  set <version>        设置指定版本号
  release <type>       发布版本（升级版本+生成更新日志）

示例:
  node version.js get
  node version.js bump patch
  node version.js set 1.2.3
  node version.js release minor "新增快捷键功能" "修复分类BUG"

选项:
  -m, --message <msg>   更新日志消息（多个消息用 | 分隔）
  -h, --help           显示帮助信息
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '-h' || command === '--help') {
    showHelp();
    process.exit(0);
  }

  let messages = [];
  let msgIndex = args.indexOf('-m');
  if (msgIndex !== -1 || args.indexOf('--message') !== -1) {
    const idx = msgIndex !== -1 ? msgIndex : args.indexOf('--message');
    messages = args[idx + 1]?.split('|').map(s => s.trim()).filter(Boolean) || [];
  }

  switch (command) {
    case 'get': {
      const version = getCurrentVersion();
      console.log(version);
      break;
    }
    case 'bump': {
      const type = args[1];
      if (!['patch', 'minor', 'major'].includes(type)) {
        console.error('Invalid bump type. Use: patch | minor | major');
        process.exit(1);
      }
      const current = getCurrentVersion();
      const newVersion = bumpVersion(current, type);
      updatePackageJson(newVersion);
      updateTauriConf(newVersion);
      updateCargoToml(newVersion);
      console.log(`\n✓ Version bumped: ${current} → ${newVersion}`);
      break;
    }
    case 'set': {
      const newVersion = args[1];
      if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
        console.error('Invalid version format. Use: x.y.z');
        process.exit(1);
      }
      updatePackageJson(newVersion);
      updateTauriConf(newVersion);
      updateCargoToml(newVersion);
      console.log(`\n✓ Version set to: ${newVersion}`);
      break;
    }
    case 'release': {
      const type = args[1];
      if (!['patch', 'minor', 'major'].includes(type)) {
        console.error('Invalid release type. Use: patch | minor | major');
        process.exit(1);
      }
      const current = getCurrentVersion();
      const newVersion = bumpVersion(current, type);

      const releaseNotes = messages.length > 0
        ? messages
        : [`${type} 版本更新`];

      updatePackageJson(newVersion);
      updateTauriConf(newVersion);
      updateCargoToml(newVersion);
      generateChangelog(newVersion, releaseNotes);

      console.log(`\n✓ Release v${newVersion} prepared!`);
      console.log(`\nNext steps:`);
      console.log(`  1. git add .`);
      console.log(`  2. git commit -m "chore: release v${newVersion}"`);
      console.log(`  3. git tag v${newVersion}`);
      console.log(`  4. git push && git push --tags`);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
