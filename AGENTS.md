# PhotoForge — 项目说明


---

## ⚡ 强制执行流程（不可跳过）

> 以下是带拦截条件的操作步骤。AI 必须按序执行。
> "不可跳过"的含义：未完成当前步骤，不允许进入下一个 Phase。

### 任何功能开发的强制第一步（Phase 0：调研 & 参考采集）

```
Phase 0 在 Phase 1 之前执行。未完成 Phase 0 不允许写任何代码。

Step 0.1: 执行 spawn_agent(explorer)，读取 PROJECT_LIFECYCLE.md 中本功能类型对应的章节。
         目的：获取完整 Checklist，确认没有遗漏环节。
         命令：spawn_agent(explorer) → "读取 PROJECT_LIFECYCLE.md 第X章，列出 [功能名] 需要覆盖的所有环节"

Step 0.2: 执行 spawn_agent(explorer)，搜索竞品开源项目源码。
         目的：了解同类功能在真实项目中怎么实现的。
         命令：spawn_agent(explorer) → "在 GitHub 搜索 [功能名] 的开源实现，分析其结构"

Step 0.3: 如涉及 UI 组件 → 执行 playwright，打开竞品页面截图。
         目的：获取视觉参考，不允许凭空想象 UI。
         命令：playwright → 打开 [竞品URL] → screenshot 保存参考图
         ⛔ 拦截条件：未执行此步骤不允许进入 Phase 3（前端/UI 层）

Step 0.4: 如涉及 UI 组件 → 执行 playwright，打开设计规范网站。
         目的：获取交互状态、动画时长、间距等标准参考。
         推荐：Apple HIG / Material Design / Ant Design
         命令：playwright → 打开 https://developer.apple.com/design/human-interface-guidelines/ → screenshot

Step 0.5: 将 Step 0.1~0.4 的结果整理为设计决策记录，再进入 Phase 1。
```

### Phase 进行中的强制检查点

| Phase | 强制前置条件 | ⛔ 拦截动作 |
|-------|------------|-----------|
| Phase 1 设计 | Phase 0 完成（有调研结果） | 不允许跳过调研直接设计 |
| Phase 2 后端 | Phase 1 Checklist 逐项确认 | 不允许跳过设计直接写代码 |
| Phase 3 前端 | Phase 0.3 截图参考已完成 + 设计令牌已确认 | 不允许凭空写 UI |
| Phase 4 集成 | 组件交互状态 7 种全部覆盖 | 不允许只写默认态就交付 |
| Phase 5 测试 | screenshot 截图验证 UI 效果 | 不允许未验证就结束 |

### 每次交付前的强制最终检查

```
Final Step 1: 执行 screenshot，截取当前实现效果。
Final Step 2: 对照 PROJECT_LIFECYCLE.md 11.3.1 静态质量 + 11.3.2 交互状态 + 11.3.3 过渡动画 Checklist。
Final Step 3: 逐项报告已有的（✅）和缺失的（❌）。
Final Step 4: 所有 ❌ 项必须补齐后才算完成。不允许带着 ❌ 交付。
```

### ⚠️ 修改后默认构建并替换到 /Applications

> 🔴 红线：禁止使用 `defaults delete com.apple.dock`，这会完全清空 Dock 所有应用。仅允许 `killall Dock` 刷新图标缓存。

> 用户要求：每次修改代码后，默认必须重新构建应用并安装到 /Applications 目录替换旧版本，确保改动可立即看到效果。

```
修改代码 → npm run build → npm run pack
pkill -f "PhotoForge.app" 2>/dev/null || true  # 关闭运行中的旧版本
rm -rf /Applications/PhotoForge.app
ditto release/mac-arm64/PhotoForge.app /Applications/PhotoForge.app  # ditto 是 macOS 标准 .app 复制工具
touch /Applications/PhotoForge.app
killall Dock 2>/dev/null || true  # 强制刷新 Dock 图标缓存（⚠️ 禁止使用 defaults delete 会清空 Dock）
（默认，不可跳过）
例外：仅修改注释/文档/配置（不含功能代码）可跳过构建安装，但需在回复中说明跳过原因。
```

### 新增实体的强制扫描

```
当项目新增一个数据实体（如"相册""标签""智能集合"等）时：

Step E.1: 执行 PROJECT_LIFECYCLE.md 7.1 实体驱动发现，列出完整生命周期。
Step E.2: 执行 6.1 实体穿透检查，确认与新实体相关的所有已有功能都加上了关联。
Step E.3: 对照第二章 2.2 CRUD Checklist，逐项确认哪项已有、哪项缺失。
Step E.4: 缺失项列入待办，不允许只实现 Create 就算完成。
```


## 定位
专业照片管理与预设滤镜编辑器，macOS 桌面应用。

## 技术栈
- Electron 41 + React 18 + TypeScript + Webpack 5
- sharp — 图像处理（缩略图/导出）
- exifr — EXIF 元数据解析
- Jest — 单元测试（39 个，在 tests/ 目录）

## 目录结构
```
src/
├── main/          # Electron 主进程
│   ├── main.ts    # 主入口，photoforge:// 协议，IPC 处理
│   ├── preload.ts # contextBridge 安全桥接
│   ├── store.ts   # 照片数据存储（library.json）
│   ├── importer.ts    # 照片导入 + 元数据 + 缩略图
│   ├── rawConverter.ts # RAW→JPEG（sips→dcraw→sharp）
│   ├── presetManager.ts # 预设管理（内置36款+自定义）
│   └── exportManager.ts # 导出管理
├── renderer/      # 渲染进程（React）
│   ├── App.tsx    # 主应用
│   ├── components/ # UI组件
│   ├── hooks/     # usePhotos, usePresets
│   ├── i18n/      # 中英文国际化
│   ├── presets/   # builtIn.ts — 9类36款内置预设
│   ├── styles/    # theme.ts — 浅色/深色主题
│   └── global.d.ts # window.photoForge 类型
└── shared/        # 共享类型 & 常量
    ├── types.ts
    └── constants.ts
tests/             # 单元测试
assets/            # 应用图标
dist/              # 构建输出
```

---

## 功能域定义（按 PROJECT_LIFECYCLE.md 7.3）

PhotoForge 涉及以下功能域：

| 功能域 | 说明 | 覆盖程度 |
|--------|------|---------|
| 文件管理 | 导入/导出/去重/引用管理 | ✅ 完整 |
| 图像浏览 | 网格/详情/对比/缩略图/按日期分组 | ✅ 完整 |
| 图像编辑/预设 | 预设创建/应用/管理/参数编辑/搜索/收藏 | ✅ 完整 |
| 组织/分类 | 相册/收藏/标签/颜色标签/智能相册 | ✅ 完整 |
| 元数据 | EXIF读取/展示/搜索/编辑(标题/描述/日期/位置) | ✅ 完整 |
| 性能/缓存 | 缩略图缓存/RAW转换缓存 | ✅ 有 |
| 搜索/筛选 | 全局搜索/预设搜索/多条件筛选 | ✅ 完整 |
| 导入导出流程 | 批量导入/导出/命名规则/打开文件夹 | ✅ 完整 |
| 历史与撤销 | 撤销/重做/编辑历史/可回退任意步骤 | ✅ 完整 |
| 统计/概览 | 统计视图/直方图/最近导入 | ✅ 完整 |

---

## 竞品调研结果（按 PROJECT_LIFECYCLE.md 7.4）

### 调研目标

| 竞品 | 类型 | 调研原因 |
|------|------|---------|
| Adobe Lightroom | 商业标杆 | 行业标准，功能最全的照片管理编辑器 |
| darktable | 开源 | 同类开源项目，可读源码借鉴 |
| Apple Photos | 系统内置 | macOS 用户最熟悉的照片管理体验 |

### 功能清单对比

| 功能/特性 | Lightroom | darktable | Apple Photos | 我们 | 优先级 | 实现参考 |
|----------|-----------|-----------|-------------|------|--------|---------|
| 搜索 | ✅ 全字段+元数据搜索 | ✅ 元数据搜索 | ✅ 即时搜索 | ⚠️ 弱 | ⭐高 | 参考 darktable 的搜索实现 |
| 筛选 | ✅ 多条件组合+智能集合 | ✅ 收藏+标签 | ✅ 相册+时刻 | ✅ 有 | — | — |
| 排序 | ✅ 多字段+自定义 | ✅ 多字段 | ✅ 按时间 | ✅ 有 | — | — |
| 撤销/重做 | ✅ 无限撤销(编辑模块内) | ✅ 历史栈 | ❌ 有限 | ❌ 无 | ⭐高 | 参考 darktable 的历史栈 |
| 编辑历史 | ✅ 步骤列表+任意回退 | ✅ 历史栈可视化 | ❌ | ❌ 无 | ⭐高 | darktable history module |
| 参数滑块编辑 | ✅ 完整 | ✅ 完整 | ✅ 基础 | ⚠️ 无 | ⭐高 | Lightroom 的滑块 UX |
| 预设搜索 | ✅ | ❌ | ❌ | ❌ 无 | ⭐高 | Lightroom 预设面板搜索框 |
| 预设收藏 | ✅ 收藏夹 | ❌ | ❌ | ❌ 无 | ⭐高 | Lightroom 的 Favorites |
| 统计/概览 | ✅ 统计面板 | ❌ | ✅ "回忆"+统计 | ❌ 无 | ⭐中 | Apple Photos 的统计思路 |
| 按日期分组 | ✅ | ❌ | ✅ 时刻/天/月/年 | ❌ 无 | ⭐中 | Apple Photos 的时间线分组 |
| 智能相册 | ✅ 智能集合 | ❌ | ✅ 智能相册 | ❌ 无 | ⭐中 | Apple Photos 的条件自动填充 |
| 导出命名规则 | ✅ 完整命名模板 | ✅ 命名模式 | ❌ | ❌ 无 | 中 | Lightroom 的命名模板 |
| 导出后打开 | ✅ | ❌ | ❌ | ❌ 无 | 中 | — |
| 最近导入 | ✅ 上次导入集合 | ❌ | ✅ 最近项目 | ❌ 无 | ⭐中 | — |
| 批量删除预设 | ✅ | ✅ | ❌ | ❌ 无 | 低 | — |
| 直方图 | ✅ 实时直方图 | ✅ 实时直方图 | ❌ | ❌ 无 | 中 | darktable 的直方图模块 |
| 色彩空间 | ✅ 完整 | ✅ 完整 | ❌ | ⚠️ 导出有 | 低 | — |
| 虚拟滚动 | N/A | N/A | N/A | ❌ 无 | 低 | react-window / react-virtuoso |
| 联机拍摄 | ✅ | ❌ | ❌ | 不做 | — | 需相机SDK |
| 地图视图 | ✅ | ✅ | ✅ | 不做 | — | 需GPS数据 |
| HDR合并 | ✅ | ✅ | ❌ | 不做 | — | 非核心 |
| 全景拼接 | ✅ | ✅ | ❌ | 不做 | — | 非核心 |

---

## 需求发现汇总（按 PROJECT_LIFECYCLE.md 7.6）

### 第一层：实体驱动发现（7.1）

#### Photo（照片）

| 必然需要 | 状态 | 说明 |
|---------|------|------|
| 搜索照片 | ⚠️ 部分 | filter.search 仅匹配 fileName/cameraModel/tags |
| 筛选照片 | ✅ | Sidebar 格式/标签/相机/收藏 |
| 排序照片 | ✅ | 6种排序字段 |
| 批量操作 | ✅ | 批量预设/导出/删除 |
| 统计照片 | ❌ | 无统计视图 |
| 最近操作 | ❌ | 无"最近导入""最近编辑"入口 |
| 收藏标记 | ✅ | ⭐ + 筛选 |
| 对比 | ✅ | CompareView |

#### Preset（预设）

| 必然需要 | 状态 | 说明 |
|---------|------|------|
| 搜索预设 | ❌ | 无搜索 |
| 筛选预设 | ✅ | 按分类 |
| 排序预设 | ❌ | 无排序 |
| 批量操作 | ⚠️ | 只有批量应用 |
| 收藏预设 | ❌ | 无收藏 |
| 对比预设效果 | ✅ | 应用后对比 |

#### Collection（相册）

| 必然需要 | 状态 | 说明 |
|---------|------|------|
| 搜索相册 | ❌ | 无 |
| 排序相册 | ❌ | 无 |
| 批量操作 | ❌ | 无 |
| 统计 | ❌ | 无计数 |
| 智能相册 | ❌ | 无 |

### 第二层：场景驱动发现（7.2）

#### 旅程1：摄影师整理本周拍摄

```
导入照片 → 去重 ✅ → 浏览剔除废片 → 标记优秀 ✅ → 批量预设 ✅ → 导出精选 ✅
```

| 缺失 | 说明 |
|------|------|
| 快速剔除废片 | 无"标记为不要→一键删除"流程 |
| 按日期分组 | 无按日/周/月浏览 |
| 最近导入入口 | 导入完无快捷回这批照片 |

#### 旅程2：修图师批量处理

```
选一批 ✅ → 应用预设 ✅ → 微调 ⚠️ → 批量导出 ✅
```

| 缺失 | 说明 |
|------|------|
| 预设微调 | 无先应用再微调参数 |
| 导出命名规则 | 无自动命名 |
| 导出后打开文件夹 | 无 |

#### 旅程3：相册管理

```
创建相册 ✅ → 筛选 → 添加 ✅ → 导出 ⚠️
```

| 缺失 | 说明 |
|------|------|
| 智能相册 | 无条件自动填充 |
| 相册排序 | 无拖拽排列 |
| 相册导出 | 无 |

### 待办优先级总表

**⭐ 高优先（体验硬伤或高频需求）— 全部已实现 ✅**

| 功能 | 类型 | 发现来源 | 状态 |
|------|------|---------|------|
| 撤销/重做 | 系统/流程型 | 竞品(LR+darktable) | ✅ 已实现 — useHistory + HistoryPanel |
| 全局搜索 | 工具/操作型 | 实体驱动+竞品 | ✅ 已实现 — SearchBar 跨7字段 |
| 预设搜索 | 工具/操作型 | 实体驱动+竞品(LR) | ✅ 已实现 — PresetPanel 搜索框 |
| 预设参数编辑 | 实体管理型 | 生命周期缺口+竞品 | ✅ 已实现 — AdjustmentPanel 16参数 |
| 预设收藏 | 实体驱动+竞品 | 竞品(LR) | ✅ 已实现 — localStorage favoriteIds |
| 编辑历史 | 系统/流程型 | 竞品(LR+darktable) | ✅ 已实现 — HistoryPanel + useHistory |

**中优先（显著提升体验）— 全部已实现 ✅**

| 功能 | 类型 | 发现来源 | 状态 |
|------|------|---------|------|
| 统计视图 | 展示/视图型 | 实体驱动+竞品(Apple) | ✅ StatisticsView |
| 按日期分组 | 展示/视图型 | 场景驱动+竞品(Apple) | ✅ DateGroupView |
| 最近导入入口 | 工具/操作型 | 场景驱动 | ✅ Sidebar + IPC |
| 智能相册 | 实体管理型 | 场景驱动+竞品 | ✅ SmartAlbumView |
| 导出命名规则 | 工具/操作型 | 场景驱动+竞品(LR) | ✅ namingTemplate |
| 相册编辑 | 实体管理型 | 生命周期缺口 | ✅ COLLECTION_UPDATE |
| 直方图 | 展示/视图型 | 竞品(LR+darktable) | ✅ Histogram |
| 导出后打开文件夹 | 工具/操作型 | 场景驱动 | ✅ openFolderAfterExport |

**低优先 / 可不做**

| 功能 | 原因 | 状态 |
|------|------|------|
| 虚拟滚动 | 数据量尚未到瓶颈 | ❌ 不做 |
| 预设批量删除 | IPC已有，UI入口可后续补 | ⚠️ 后端已实现 |
| 色彩空间编辑 | 导出已有 | ✅ Settings 可选 |
| 地图视图 | 需GPS数据，非核心 | ❌ 不做 |
| HDR合并/全景拼接 | 非核心 | ❌ 不做 |
| 联机拍摄 | 需SDK | ❌ 不做 |

---

## 功能类型实例（按四类框架）

### 一、实体管理型

#### Photo — ✅ 生命周期完整

#### Preset — ⚠️ 参数编辑/搜索/收藏缺失

#### Collection — ⚠️ 编辑/智能相册/导出缺失

#### Settings — 单例，Read + Update ✅

### 二、工具/操作型

- 搜索 — ⚠️ 大量未实现（详见待办总表）
- 筛选 — ✅ 缺方案保存
- 排序 — ✅ 缺持久化
- 导出 — ✅ 缺进度/完成提示

### 三、系统/流程型

- 撤销/重做 — ❌ 完全未实现（高优先）
- RAW转换 — ✅
- 缺失文件检测 — ⚠️ 无修复操作

### 四、展示/视图型

- 网格 — ✅ 缺虚拟滚动
- 对比 — ✅ 缺缩放同步/像素级
- 详情 — ✅
- 统计视图 — ❌ 不存在（高优先）
- 按日期分组 — ❌ 不存在（中优先）

---

## 导航架构

### 一级导航

| ViewMode | 场景 | 组件 |
|----------|------|------|
| grid | 浏览筛选 | PhotoGrid + Sidebar |
| detail | 单张编辑 | PhotoDetail |
| compare | 对比 | CompareView |
| collections | 相册管理 | 相册列表+网格 |
| settings | 设置 | SettingsView |

### 二级导航

| 视图 | 二级结构 |
|------|---------|
| grid | 左右分栏：Sidebar + PhotoGrid |
| detail | 右面板 Tabs：📋信息 / ✨调整 / 🏷️标注 / ✂️变换 |
| compare | 模式切换：并排/叠加 |
| collections | 左右分栏：相册列表+内容 |
| settings | 左侧分组：通用/导入/导出/性能/关于 |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| ⌘I | 导入 |
| ⌘E | 导出 |
| ⌘1~4 | 切换视图 |
| ⌘\ | 侧边栏 |
| ⌘P | 预设面板 |
| ⌘L | 收藏 |
| ⌫ | 删除 |
| ⌘A | 全选 |
| ← → | 切换照片 |

---

## 关键机制

### RAW 文件显示
1. 导入时：sips → RAW→JPEG 缩略图
2. 运行时：`photoforge://raw/<路径>` 自定义协议
3. `<img src>` 用 photoforge:// 或 file:// URL

### IPC 通信
渲染进程通过 `window.photoForge.*`，主进程 ipcMain.handle

### 预设系统
16参数 PresetAdjustment，CSS filter 实时预览，导出时 sharp 应用

## 命令
```bash
npm start          # 编译+启动
npm run build      # 仅编译
npm test           # 运行测试
npm run pack       # 打包为 .app
```

## 照片库位置
`~/Pictures/PhotoForge_Library/` （originals/ + thumbnails/ + converted/ + library.json）

## 主题
浅色+深色，`src/renderer/styles/theme.ts`，品牌色 #7c3aed

## 编码约定
- React 函数组件 + inline styles
- 主进程 class 风格
- 类型集中在 shared/types.ts
- 常量集中在 shared/constants.ts
- 新文案必须加到 i18n

---

## UI 设计系统现状（按 PROJECT_LIFECYCLE.md 第十一章）

### 设计令牌缺失分析

| 令牌类别 | 当前状态 | 问题 |
|---------|---------|------|
| 颜色 | ✅ theme.ts 有完整定义 | 无问题 |
| 间距阶梯 | ❌ 无统一定义 | 各组件随意写 6/8/10/12/14/16/24px，不统一 |
| 圆角阶梯 | ❌ 无统一定义 | 4/6/8/10/12px 混用 |
| 阴影层级 | ❌ 只有一种 | `0 2px 8px rgba(0,0,0,0.06)` 到处用 |
| 字体层级 | ❌ 部分隐性存在 | 字号 11/12/13/14/17/20 但无正式定义 |
| 字重对应 | ❌ 无规则 | 同是 13px 有的 400 有的 500 有的 600 |
| 动画时长 | ❌ 完全没有 | 无过渡动画 |
| 动画曲线 | ❌ 完全没有 | 无过渡动画 |
| 组件高度 | ❌ 无标准 | 按钮高度不统一 |

### 应定义的设计令牌

```typescript
// 建议在 theme.ts 或新建 design-tokens.ts 中定义

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;
const SHADOW = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.1)',
  lg: '0 8px 24px rgba(0,0,0,0.15)',
  xl: '0 16px 48px rgba(0,0,0,0.2)',
  focus: '0 0 0 3px rgba(124,58,237,0.3)',
} as const;
const TYPO = {
  caption: { size: 11, weight: 400 },   // 辅助信息
  body: { size: 13, weight: 400 },      // 正文
  bodyBold: { size: 13, weight: 500 },  // 按钮文字
  subheading: { size: 15, weight: 500 }, // 小标题
  heading: { size: 18, weight: 600 },    // 标题
  display: { size: 24, weight: 700 },    // 大标题
} as const;
const DURATION = { instant: 100, fast: 150, normal: 250, slow: 400 } as const;
const EASING = {
  out: 'cubic-bezier(0.0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;
```

### 交互状态缺失分析

| 组件 | hover | active | focus | disabled | selected | loading |
|------|-------|--------|-------|----------|----------|---------|
| 按钮类 | ⚠️ 部分 | ❌ | ❌ | ⚠️ 部分 | ❌ | ❌ |
| 照片卡片 | ❌ | ❌ | ❌ | N/A | ⚠️ outline | ❌ |
| 侧边栏筛选项 | ⚠️ 部分 | ❌ | ❌ | ❌ | ⚠️ 背景变色 | ❌ |
| 预设卡片 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 输入框 | ❌ | N/A | ❌ | ⚠️ | N/A | ❌ |
| 下拉菜单项 | ⚠️ 部分 | ❌ | ❌ | ❌ | ⚠️ | ❌ |

**结论：** 大部分组件只有默认态，交互状态严重缺失。

### 过渡动画缺失分析

| 应有动画的交互 | 当前状态 |
|--------------|---------|
| 按钮 hover | ❌ 无过渡 |
| 面板展开/收起 | ❌ 无过渡 |
| 模态框弹出 | ❌ 无过渡 |
| 视图切换 | ❌ 无过渡 |
| 选中/取消选中 | ⚠️ outline 无过渡 |
| Toast 出现/消失 | N/A (无Toast) |
| 删除后列表合拢 | ❌ 直接消失 |

**结论：** 所有交互都是瞬间切换，这是"简陋感"的最大来源。

### 微交互缺失分析

| 场景 | 应有微交互 | 当前 |
|------|-----------|------|
| 收藏点击 | ⭐ 放大弹回闪烁 | 仅文字切换 ☆→⭐ |
| 评分切换 | 星星依次点亮 | 无动画 |
| 预设应用 | 亮度脉冲反馈 | 无反馈 |
| 删除确认 | 淡出缩小+合拢 | 直接消失 |
| 进度完成 | 变绿+消失 | 仅文字变化 |

### UI 待办清单

**第一步：建立设计令牌** — 在 theme.ts 中新增间距/圆角/阴影/字体/动画令牌

**第二步：补交互状态** — 最紧迫，按优先级：
1. 所有按钮补 hover+active+focus
2. 照片卡片补 hover（阴影提升）+selected（accent边框）
3. 侧边栏筛选项补完整状态
4. 预设卡片补 hover+selected
5. 输入框补 focus ring

**第三步：补过渡动画** — 所有交互状态切换加 transition

**第四步：补微交互** — 收藏动画/评分动画/预设应用反馈

**第五步：视觉参考搜索** — 对核心组件搜索竞品 UI 参考后优化

---

## macOS 应用图标规范（Apple HIG + 逆向实测）

> 来源：从 Apple Photos / Music / FaceTime / VS Code 等系统应用的 AppIcon.icns 中逆向提取的参数。

### .icns 图标格式要求

- 必须使用 `iconutil` 从 `.iconset` 目录生成 `.icns`
- `.iconset` 必须包含以下 10 个尺寸：

| 文件名 | 像素尺寸 | 用途 |
|--------|---------|------|
| icon_16x16.png | 16×16 | 菜单栏/小尺寸 |
| icon_16x16@2x.png | 32×32 | Retina 菜单栏 |
| icon_32x32.png | 32×32 | 窗口/文件 |
| icon_32x32@2x.png | 64×64 | Retina 窗口 |
| icon_128x128.png | 128×128 | Dock 标准尺寸 |
| icon_128x128@2x.png | 256×256 | Dock Retina |
| icon_256x256.png | 256×256 | 图标视图 |
| icon_256x256@2x.png | 512×512 | Retina 图标视图 |
| icon_512x512.png | 512×512 | 大图标/通用 |
| icon_512x512@2x.png | 1024×1024 | App Store/最大 |

### Dock 图标视觉比例（关键约束）

| 参数 | 标准值 | 说明 |
|------|--------|------|
| **圆角半径** | **17%** 整图尺寸 | 不是 22%！从 Apple 图标实测：256px → 43px |
| **白色背景宽度** | **~96%** 整图宽度 | 居中，左右各留 ~2% |
| **白色背景高度** | **~81%** 整图高度 | 居中，顶部留 ~10%，底部留 ~7% |
| **内容高度** | **~81-84%** 整图高度 | 所有视觉元素不超此范围 |
| **主色调** | **纯白 #ffffff** 背景 | 或极浅灰色 #f9f9f9 渐变 |
| **符号颜色** | **中性灰** 或 **品牌色** | 建议单色/双色，不超 3 色 |

### 生成的图标的验证方法

生成 icon.png 后，用以下命令验证：
```
node -e "const sharp=require('sharp'); sharp('assets/icon.png').ensureAlpha().raw().toBuffer().then(b=>{const S=1024;function a(x,y){return b[(y*S+x)*4+3]};console.log('4角透明:',a(0,0)==0&&a(S-1,0)==0&&a(0,S-1)==0&&a(S-1,S-1)==0)})"
```

### 图标生成关键教训（避免反复错误）

#### 1. 白色背景填满整张画布
- 白色圆角矩形必须**填满整个 1024×1024 画布**（不是之前设的 92% 或 96%×81%）
- 实测 VS Code、TypeForge、WeChat 等：内容均占 **100% 宽度**
- 内容高度控制在 **~80-84%**（顶部~8-10% 留白，底部~6-8% 留白）
- 圆角半径 **18%**（1024px → 184px，TypeForge 实测）

#### 2. 使用填充形状而非 SVG stroke
- `fill="none" stroke-width="4"` 在 1024px 下正常，缩放到 32px 时 4px → 0.125px = 消失
- 必须使用 `fill="color"` 的实心形状，确保缩放后仍有可见像素
- 线条风格改用**细长填充矩形/多边形**代替 SVG stroke

#### 3. 32px 验证是底线
- 每次生成后必须验证 32px 版本是否有可辨识内容
- 方法：统计 32×32 图标中非白非透明像素数，应 ≥ 100
- 打印 32px ASCII 地图目视确认形状可辨识

#### 4. Electron 打包图标刷新
- electron-builder 缓存旧图标：必须先 `rm -rf release/` 再 `npm run pack`
- 仅 `npm run build` 不会更新 `.app` 内的图标

---

### Electron 图标部署注意事项

- `electron-builder` 在打包时从 `assets/icon.icns` 复制图标到 `.app/Contents/Resources/`
- 必须重新 `npm run pack` 才会更新打包后的图标
- 仅 `npm run build` 不会更新 `.app` 内的图标
- macOS Dock 会缓存图标：安装后执行 `killall Dock` 刷新
- ⚠️ 禁止使用 `defaults delete com.apple.dock`（会清空 Dock 全部应用）


## 可用技能与自动调用规则

> 以下技能已安装在 Codex CLI 中，应按规则自动调用，不需要用户手动指定。

### 竞品调研 & 参考学习

| 技能 | 用途 | 触发规则 |
|------|------|---------|
| `playwright` | 自动化浏览器，打开竞品网站截图查看UI | 实现 UI 组件前，自动打开竞品网页截图，作为视觉参考 |
| `screenshot` | 截取屏幕/窗口内容 | 配合 playwright 使用，截取竞品 UI 作为参考 |
| `figma` | 获取 Figma 设计稿，设计转代码 | 如项目有 Figma 设计稿，直接读取并实现 |

**自动调用规则：**
- 实现新 UI 组件前 → 必须用 `playwright` + `screenshot` 打开至少1个竞品页面截图，作为设计参考
- 搜索设计最佳实践时 → 用 `playwright` 打开设计规范网站（Material Design / Apple HIG）
- 如有 Figma 链接 → 用 `figma` 读取设计稿，按稿实现

### UI 质量验证

| 技能 | 用途 | 触发规则 |
|------|------|---------|
| `playwright-interactive` | 持久浏览器会话，手动/自动化QA | 完成功能后启动，验证UI交互状态是否完整 |
| `screenshot` | 截图对比 | 改动前后截图，验证视觉效果 |

**自动调用规则：**
- 完成新功能 Phase 4 后 → 用 `screenshot` 截图验证 UI
- 发现 UI 问题时 → 用 `playwright-interactive` 启动持久会话交互调试

### 代码质量 & 安全

| 技能 | 用途 | 触发规则 |
|------|------|---------|
| `security-best-practices` | 安全审查 | 处理文件路径/IPC/用户输入时自动调用 |
| `openai-docs` | 查询API文档 | 涉及 OpenAI API 集成时调用 |

### 项目管理

| 技能 | 用途 | 触发规则 |
|------|------|---------|
| `notion-research-documentation` | 调研报告写入Notion | 竞品调研结果可写入 Notion 持久保存 |
| `notion-knowledge-capture` | 知识捕获 | 重要设计决策可捕获到 Notion |
| `linear` | 任务跟踪 | 大版本规划时可创建 Linear issue |
| `yeet` | 一键提交PR | 完成功能后用 yeet 提交 |

### 文档 & 输出

| 技能 | 用途 | 触发规则 |
|------|------|---------|
| `pdf` | PDF生成 | 如需导出文档/报告时使用 |
