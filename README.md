# Music Lyric Visualizer 🎵

一款沉浸式的音乐频谱可视化与歌词翻译应用，支持解析抖音等平台的音乐链接，实时展示音频频谱和中英双语歌词。

## ✨ 主要功能

- **音频频谱可视化**：动态频谱柱条与中央环形波形，实时响应音频节奏
- **歌词自动识别与翻译**：自动搜索歌词并翻译成中文，支持双语对照显示
- **抖音链接解析**：一键解析抖音分享链接，自动提取音频、封面和歌词
- **歌词交互**：支持拖拽移动歌词位置、双击恢复居中、点击关闭歌词
- **沉浸式背景**：歌曲封面作为背景，配合模糊与暗色遮罩效果

## 🛠️ 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | ^18.2.0 |
| 编程语言 | TypeScript | ^5.2.2 |
| 构建工具 | Vite | ^5.2.0 |
| CSS框架 | Tailwind CSS | ^3.4.1 |
| 音频处理 | Web Audio API | - |
| 可视化 | Canvas 2D | - |
| 后端代理 | Node.js | - |
| 翻译服务 | 腾讯翻译君 TranSmart | - |

## 📁 项目结构

```
music-lyric-visualizer/
├── src/                      # 前端源码
│   ├── components/           # React 组件
│   │   ├── SpectrumCanvas.tsx   # 频谱可视化组件
│   │   ├── LyricDisplay.tsx     # 歌词显示组件
│   │   ├── PlayControl.tsx      # 播放控制组件
│   │   ├── AudioUrlInput.tsx    # URL 输入组件
│   │   └── SongCover.tsx        # 封面组件
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useAudioAnalyzer.ts  # 音频分析 Hook
│   │   └── useAnimationLoop.ts  # 动画循环 Hook
│   ├── pages/                # 页面组件
│   │   └── SpectrumPage.tsx     # 主页面
│   └── utils/                # 工具函数
│       ├── audioProcessor.ts    # 音频处理工具
│       ├── lyricService.ts      # 歌词服务
│       ├── musicParser.ts       # 音乐解析器
│       ├── spectrumGenerator.ts # 模拟数据生成器
│       └── urlResolver.ts       # URL 解析器
├── server.mjs                # Node.js 代理服务器
├── index.html                # HTML 入口
├── package.json              # 项目配置
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
└── tsconfig.json             # TypeScript 配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/weapon111/music-lyric-visualizer.git
cd music-lyric-visualizer
```

2. **安装依赖**

```bash
npm install
```

### 启动开发服务器

**方式一：使用 npm 脚本（推荐）**

```bash
# 启动前端开发服务器（端口 5173）
npm run dev

# 在另一个终端启动后端代理服务器（端口 3001）
node server.mjs
```

**方式二：同时启动（Windows PowerShell）**

```powershell
Start-Process npm -ArgumentList "run dev"
Start-Process node -ArgumentList "server.mjs"
```

### 访问应用

打开浏览器访问：`http://localhost:5173`

## 📖 使用说明

### 基本操作

1. **输入音乐链接**

在顶部输入框中粘贴抖音分享链接（如 `https://qishui.douyin.com/s/iC977RRG/`），按回车键或点击播放按钮。

2. **等待解析**

应用会自动解析链接，提取音频、封面和歌词，然后进行翻译（约 1-2 秒）。

3. **播放控制**

- 点击底部播放按钮开始/暂停播放
- 频谱和波形会实时响应音频节奏

4. **歌词交互**

- 拖动歌词可改变显示位置
- 双击歌词恢复居中
- 点击歌词右上角 × 关闭歌词显示
- 关闭后可点击右上角音乐图标重新显示

### 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 🔧 配置说明

### 代理服务器端口

后端代理服务器默认监听 **3001** 端口，如需修改，编辑 `server.mjs` 第 6 行：

```javascript
const PORT = 3001
```

### Vite 代理配置

Vite 已配置 `/api` 前缀代理到 `http://localhost:3001`，在 `vite.config.ts` 中：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

## 📱 响应式设计

应用支持多种屏幕尺寸：

- **桌面端**：完整功能，最佳体验
- **平板端**：自适应布局
- **移动端**：触控优化，简化界面

## 🎯 目标用户

- **音乐爱好者**：享受沉浸式音乐体验
- **开发者**：学习音频可视化和 Web Audio API
- **内容创作者**：用于直播、视频制作的背景素材
- **英语学习者**：通过双语歌词学习英语

## ❓ 常见问题与排错指南

### 问题一：PowerShell 中 `npm run dev` 报错 "无法加载文件，禁止运行脚本"

**问题描述**

在 Windows PowerShell 中执行 `npm run dev` 或任何 `npm` 命令时，出现以下错误：

```
npm : 无法加载文件 C:\Program Files\nodejs\npm.ps1，因为在此系统上禁止运行脚本。
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

**原因**

PowerShell 的执行策略（Execution Policy）默认禁止运行 `.ps1` 脚本，而 `npm` 在 PowerShell 中是以 `npm.ps1` 脚本形式存在的，因此被系统拦截。

**解决方案**

#### 方案 A：使用命令提示符（cmd）运行（推荐，无需修改系统设置）

直接使用 **命令提示符（Command Prompt / cmd）** 而非 PowerShell 执行命令。cmd 不受 PowerShell 执行策略限制，`npm` 命令可直接运行。

1. 按 `Win + R`，输入 `cmd`，回车打开命令提示符
2. 执行命令（注意 `cd /d` 用于跨盘符切换）：

```cmd
cd /d "d:\你的项目路径"
npm run dev
```

#### 方案 B：修改 PowerShell 执行策略（永久解决）

以**管理员身份**打开 PowerShell，执行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

输入 `Y` 确认。该策略允许运行本地脚本，但要求从互联网下载的脚本必须有数字签名，兼顾安全性与便利性。

**验证方法**：关闭所有 PowerShell 窗口，重新打开后执行：

```powershell
Get-ExecutionPolicy
```

输出应为 `RemoteSigned`，此时 `npm` 命令可正常使用。

---

### 问题二：cmd 中 `cd` 切换目录后路径没变

**问题描述**

在 cmd 中执行 `cd D:\项目路径` 后，提示符仍然显示 `C:\Windows\System32>`，说明当前目录并未切换。

**原因**

在 Windows cmd 中，`cd` 命令默认只在**当前盘符**内切换目录，不会自动切换到另一个盘符。例如当前在 `C:` 盘，执行 `cd D:\xxx` 只会记录 D 盘的目标路径，但当前盘符仍然是 C 盘。

**解决方案**

使用 `cd /d` 参数（`/d` 表示 drive，即切换盘符）：

```cmd
cd /d "d:\智能家居物理AI能耗优化SaaS系统"
```

或者分两步执行：

```cmd
d:
cd "智能家居物理AI能耗优化SaaS系统"
```

**验证方法**：执行后观察命令提示符，应显示为：

```
D:\智能家居物理AI能耗优化SaaS系统>
```

---

### 问题三：浏览器访问 `http://localhost:5173` 无法打开

**问题描述**

浏览器显示 "无法访问此网站" 或 `ERR_CONNECTION_REFUSED`。

**排查步骤**

#### 第一步：确认 Vite 开发服务器是否启动

查看运行 `npm run dev` 的终端窗口，正常启动应显示：

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

如果没有看到此输出，说明服务器启动失败，请检查终端中的错误信息。

#### 第二步：确认后端代理服务器是否启动

在另一个终端窗口运行 `node server.mjs`，正常启动应显示：

```
Proxy server running on http://localhost:3001
```

#### 第三步：检查端口是否被占用

在 cmd 中执行：

```cmd
netstat -ano | findstr ":5173"
netstat -ano | findstr ":3001"
```

如果有 `LISTENING` 状态的输出，说明端口已被监听，服务正常运行；如果没有输出，说明服务未启动。

#### 第四步：使用 curl 验证服务响应

```cmd
curl -s -o NUL -w "HTTP %%{http_code}" http://localhost:5173/
```

- 返回 `HTTP 200`：前端服务正常
- 返回 `HTTP 000` 或连接失败：服务未启动或端口被防火墙拦截

#### 常见原因

| 原因 | 解决方法 |
|------|----------|
| 服务器未启动 | 按启动指南在两个终端分别运行前端和后端 |
| 端口被其他程序占用 | 修改 `vite.config.ts` 中的端口，或关闭占用端口的程序 |
| 防火墙拦截 | 临时关闭防火墙测试，或将 Node.js 添加到防火墙白名单 |
| 当前目录不对导致启动失败 | 确认 cmd 提示符显示的路径是项目根目录 |

---

### 问题四：歌词翻译失败或不显示

**问题描述**

播放音乐后歌词始终为空，或显示 "正在识别并翻译歌词" 后一直转圈。

**排查步骤**

1. **确认后端代理服务器是否运行**：翻译请求通过后端代理转发，若 `server.mjs` 未启动，翻译会失败
2. **检查音乐是否有歌词信息**：部分纯音乐或小众歌曲可能搜索不到歌词
3. **查看浏览器控制台**：按 `F12` 打开开发者工具，查看 Console 和 Network 标签中的错误信息

**常见原因**

- 后端代理未启动 → 启动 `node server.mjs`
- 网络无法访问翻译服务 → 腾讯翻译君在国内可正常访问，如仍有问题可检查网络
- 歌曲名称无法识别 → 可尝试使用更明确的音乐链接

---

## 📝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add your feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🤝 致谢

- [Tencent TranSmart](https://transmart.qq.com/) - 翻译服务
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [React](https://react.dev/) - 前端框架
