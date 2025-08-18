# 移动端优化说明

## 移动端侧边栏导航

### 功能特性

1. **响应式设计**
   - 在桌面端（>768px）显示传统的水平导航栏
   - 在移动端（≤768px）自动切换为侧边栏导航

2. **移动端侧边栏**
   - 左侧滑出式侧边栏（从左侧滑入）
   - 包含完整的导航菜单
   - 带有遮罩层，点击外部可关闭
   - 平滑的动画效果
   - 支持子菜单展开/收起功能
   - 每个主要分类都有展开按钮（+/-）

3. **导航结构**
   - **ORIENTAL FURNITURE** (可展开)
     - SCREENS, CHAIRS, TABLES, CABINETS & CUPBOARDS, RUGS, OTHERS
   - **ANTIQUE FURNITURE** (可展开)
     - SEATING, STORAGE, TABLES, OTHERS
   - **LIGHTING** (可展开)
     - SHOP BY CATEGORY, FORTUNY COLLECTION, YAMAGIWA COLLECTION
   - **ART** (可展开)
     - CATEGORY, ORIENTAL ART
   - **FASHION** (可展开)
     - SHOP BY CATEGORY, RUNWAY ARCHIVE, CURATED COLLECTION, BRAND PARTNERS
   - **EXHIBITION** (直接链接)
   - **PROJECT** (直接链接)
   - **PRESS** (直接链接)
   - **ABOUT** (可展开)
     - OUR STORY, CONTACT, AMBELIE SHANGHAI, AMBELIE HANGZHOU

4. **交互功能**
   - 汉堡菜单按钮（三条横线）
   - 关闭按钮（X）
   - 点击导航项自动关闭侧边栏
   - 搜索按钮集成在侧边栏中
   - 用户菜单集成在侧边栏中
   - 子菜单展开/收起按钮（使用自定义图标）
   - 支持多级导航结构
   - 展开按钮采用自定义图标设计，符合网站整体风格

5. **布局优化**
   - 桌面端：搜索按钮在左侧，Logo居中，用户菜单在右侧
   - 移动端：搜索按钮集成到侧边栏，汉堡菜单在左侧，Logo居中，用户菜单在右侧
   - 侧边栏从左侧滑出，更符合移动端习惯
   - Logo居中显示，保持视觉平衡

### 技术实现

1. **状态管理**
   - `isMobileMenuOpen`: 控制侧边栏开关状态
   - `toggleMobileMenu()`: 切换侧边栏
   - `closeMobileMenu()`: 关闭侧边栏
   - `mobileMenuExpanded`: 管理各子菜单的展开/收起状态

2. **样式系统**
   - 使用CSS模块化样式
   - 响应式媒体查询（768px断点）
   - CSS动画：`fadeIn`（遮罩层淡入）和 `slideInLeft`（侧边栏从左侧滑入）
   - 固定定位和z-index层级管理
   - 左侧阴影效果（`box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1)`）
   - 自定义图标系统：展开.png / 收缩.png

3. **用户体验**
   - 触摸友好的按钮尺寸
   - 清晰的视觉层次
   - 一致的品牌风格
   - 无障碍访问支持
   - 首页"Sign In"文字在初始状态下显示为白色

### 使用方法

1. **桌面端**
   - 正常显示水平导航栏
   - 鼠标悬停显示下拉菜单

2. **移动端**
   - 点击右上角汉堡菜单按钮
   - 侧边栏从右侧滑出
   - 点击导航项或关闭按钮关闭

### 文件修改

- `components/Header.tsx`: 添加移动端侧边栏逻辑
- `components/Header.module.css`: 添加移动端样式

### 浏览器兼容性

- 支持所有现代浏览器
- 响应式设计适配各种屏幕尺寸
- 触摸设备友好
