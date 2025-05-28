# Ambelie - 古董艺术品展示网站

一个现代化的古董艺术品展示网站，使用Next.js构建，专注于亚洲艺术品、古董家具和设计师作品的展示。

## 项目特色

- 🎨 现代化的响应式设计
- 🖼️ 优雅的图片展示和悬停效果
- 📱 完全响应式布局
- 🎭 流畅的动画和过渡效果
- 🧭 直观的导航和分类系统
- 📧 联系表单和展览信息

## 技术栈

- **框架**: Next.js 14
- **语言**: TypeScript
- **样式**: CSS3 (自定义样式)
- **字体**: Solena-Regular (标题), Poppins-ExtraLight (正文)
- **图标**: Font Awesome 6

## 页面结构

- **首页**: 视频背景、产品分类展示、展览信息
- **展览页**: 当前和过往展览展示
- **分类页**: 产品分类浏览
- **关于页**: 公司介绍和历史
- **联系页**: 联系表单和门店信息

## 开发环境设置

1. 克隆仓库
```bash
git clone [repository-url]
cd ambelie-next-app
```

2. 安装依赖
```bash
npm install
```

3. 运行开发服务器
```bash
npm run dev
```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 构建和部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
ambelie-next-app/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React组件
│   └── Header.tsx         # 页眉组件
├── public/               # 静态资源
│   ├── assets/           # 图片和媒体文件
│   └── fonts/            # 字体文件
└── README.md
```

## 设计特色

- **品牌色彩**: 绿色 (#7E7A20), 红色 (#880913), 奶油色 (#F8EBD2)
- **响应式网格**: 灵活的产品展示网格
- **动画效果**: 平滑的悬停和过渡动画
- **图片切换**: 产品悬停时的图片切换效果

## 贡献

欢迎提交问题和功能请求。

## 许可证

此项目为私有项目。
