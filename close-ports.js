import { execSync } from 'child_process';

// 关闭占用端口的进程
function closePorts() {
  try {
    // 检查端口 5173-5177
    for (let port = 5173; port <= 5177; port++) {
      try {
        // 使用 netstat 命令查找占用端口的进程
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        
        // 提取进程 ID
        const lines = output.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          
          // 结束进程
          execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
          console.log(`Closed process ${pid} on port ${port}`);
        }
      } catch (error) {
        // 如果端口没有被占用，忽略错误
        console.log(`Port ${port} is not in use`);
      }
    }
  } catch (error) {
    console.error('Error closing ports:', error);
  }
}

closePorts();