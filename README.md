# PhotoForge 📷

专业照片管理与预设滤镜编辑器，支持主流相机 RAW 格式。

---

## 🚀 如何启动（小白指南）

### 方式一：双击 app 启动（最简单）

我已经把应用打包好了，就在你的桌面上：

> **`/Users/edisonturue/Desktop/PhotoForge.app`**

**直接双击它就能打开！** 跟打开微信、QQ 一样。

> 如果 macOS 提示"无法打开"，是因为应用没有苹果开发者签名。解决方法：
> 1. 右键点击 `PhotoForge.app` → 选择「打开」
> 2. 在弹出的对话框中再点「打开」
> 3. 以后就能正常双击了

---

### 方式二：命令行启动（开发者模式）

打开终端（Terminal），输入：

```bash
cd ~/Downloads/paper/PhotoForge
npm start
```

这会先编译代码，然后启动应用。

---

## 📖 现在这个项目是什么形态？

| 层级 | 是什么 | 文件位置 |
|------|--------|----------|
| **桌面 app** | 已经打包成 macOS 应用 (.app) | 桌面上的 `PhotoForge.app` |
| **源代码** | TypeScript + React + Electron 项目 | `~/Downloads/paper/PhotoForge/` |
| **照片库** | 自动在"图片"文件夹下创建 | `~/Pictures/PhotoForge_Library/` |

简单理解：
- **Electron** = 一个可以把网页变成桌面应用的框架（微信桌面版、VS Code 都是用它做的）
- **React** = 做用户界面的框架（你看到的按钮、网格、弹窗都是它）
- **TypeScript** = JavaScript 的升级版，有类型检查不容易出错
- **sharp / sips** = 图像处理工具，负责把 RAW 文件转成你能看到的图片

---

## ✨ 功能说明

### 导入照片
- 打开 app → 点击左上角 **「📥 导入照片」** 按钮
- 选择包含照片的文件夹
- 支持 **NIKON NEF、Canon CR2/CR3、Sony ARW** 等所有主流 RAW 格式
- 也支持 JPEG、PNG、TIFF、WebP、HEIC 等普通格式
- 导入时自动：复制到本地库 → 生成缩略图 → 读取 EXIF 信息

### 浏览照片
- 主界面是照片网格，可调卡片大小（小/中/大）
- 单击选中，双击打开详情
- Cmd+点击 多选

### 筛选与排序
- **左侧边栏**：按格式、颜色标签、相机型号筛选
- **顶部工具栏**：按拍摄时间/文件名/格式/大小/评分排序
- 可筛选收藏照片

### 预设 & 滤镜
- 点击右上角 **「✨ 预设」** 打开预设面板
- 9 大分类 36 款内置预设
- 点击预设名称即可 **一键套用**
- 选中多张照片 → 点击 **「🎨 批量预设」** → 批量套用
- 支持创建自定义预设

### 评分 & 标签
- 双击照片进入详情 → 在右侧面板打星、添加颜色标签、添加文字标签

### 导出
- 详情页点 **「📤 导出」** → 选择保存位置和格式
- 支持 JPEG / PNG / WebP 导出

### 照片对比
- 选中 ≥2 张照片 → 点击 **「🔄 对比」**

---

## 🛠 技术栈

- **Electron** — 桌面应用框架
- **React + TypeScript** — UI 层
- **Webpack** — 打包
- **sharp** — 图像处理 & 缩略图
- **sips** (macOS 原生) — RAW 文件解码
- **exifr** — EXIF 元数据读取
- **Jest** — 单元测试（39 个测试全部通过）

---

## 项目结构

```
PhotoForge/
├── PhotoForge.app              ← 打包好的桌面应用
├── src/
│   ├── main/                   ← 主进程（文件操作、RAW转换、数据存储）
│   │   ├── main.ts             ← 主入口 & 自定义协议 photoforge://
│   │   ├── preload.ts          ← 安全桥接
│   │   ├── store.ts            ← 照片数据库
│   │   ├── importer.ts         ← 照片导入 + 元数据提取
│   │   ├── rawConverter.ts    ← RAW→JPEG 转换（sips/dcraw/sharp）
│   │   ├── presetManager.ts    ← 预设管理
│   │   └── exportManager.ts    ← 导出管理
│   ├── renderer/               ← 渲染进程（用户界面）
│   │   ├── App.tsx             ← 主应用
│   │   ├── components/         ← UI 组件（7个）
│   │   ├── hooks/              ← React Hooks
│   │   └── presets/            ← 36 款内置预设
│   └── shared/                 ← 共享类型 & 常量
├── tests/                      ← 39 个单元测试
└── assets/                     ← 应用图标
```
