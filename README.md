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
