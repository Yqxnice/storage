import Store from 'electron-store';
import { app } from 'electron';

// 模拟清除首次启动标记
const store = new Store({
  name: 'desk-organizer'
});

console.log('正在清除首次启动标记...');
store.delete('hasInitialized');
console.log('✓ 已清除 hasInitialized 标记');
console.log('✓ 下次启动将执行首次初始化流程');
