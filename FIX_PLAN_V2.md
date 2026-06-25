# Fix Plan V2: 图片显示模糊 + 分辨率 160×120

## 完整数据链路追踪

```
用户导入照片
  → importer.ts: extractMetadata(libraryFilePath) → 得到 width/height
  → importer.ts: generateThumbnail(libraryFilePath) → 得到 thumbnailPath
  → store.addPhoto({ filePath: libraryFilePath, width, height, thumbnailPath, ... })
  → library.json 持久化

用户打开应用
  → store.load() 从 library.json 读取所有 photo 到内存 Map
  → GET_ALL_PHOTOS → store.getAllPhotos() → Map.values() → 拿到原始 photo 对象
  → main.ts: 给 photo 添加 displayUrl = getDisplayUrl(thumbnailPath, filePath, fileFormat)
  → 渲染进程收到 photo 对象 (含 displayUrl)

渲染进程显示图片
  → PhotoGrid: <img src={photo.displayUrl || photo.thumbnailPath || ...}>
  → PhotoDetail: imageSrc = fullResSrc || photo.displayUrl || photo.thumbnailPath || ...
  → SearchBar: <img src={photo.thumbnailPath || ...}>  ← 没用 displayUrl!
  → SmartAlbumView: <img src={photo.thumbnailPath || ...}>  ← 没用 displayUrl!
  → DateGroupView: <img src={photo.thumbnailPath || ...}>  ← 没用 displayUrl!
```

## 根因分析：两个独立问题

### 问题 A：信息面板中分辨率显示 160×120

**根因：library.json 中已存储的数据 width=160, height=120**

这不是显示代码的问题，而是数据本身错了。来源有两个可能：

1. **exifr 的 ImageWidth/ImageHeight 字段**：某些 RAW/HEIC 文件中，EXIF 的 `ImageWidth`/`ImageHeight` 字段存的是嵌入预览图的尺寸（160×120），而非实际像素尺寸。exifr 读取后覆盖了 sips 已经拿到的正确值。

   代码顺序：sips（拿到正确 pixelWidth/pixelHeight）→ exifr（用 ImageWidth 覆盖，变成 160×120）→ sharp（已经不执行，因为 width/height 已有值）

2. **sharp 对某些 RAW 文件返回嵌入预览尺寸**：`sharp(filePath, { failOn: 'none' }).metadata()` 在无法完整解码 RAW 时，返回的是嵌入 JPEG 预览的尺寸。

   当前代码已改为「总是用 sharp 覆写 width/height」，但这反而让问题更严重——如果 sharp 也返回了嵌入预览尺寸。

**关键发现**：exifr 代码中用 `ImageWidth` 覆盖了 `pixelWidth`！

```
// sips 拿到: width=5472, height=3648 (正确)
// exifr 拿到: ImageWidth=160, ImageHeight=120 (嵌入预览)
// 代码: metadata.width = data.ImageWidth  → 覆盖为 160!
```

### 问题 B：网格图片模糊

**根因：`getDisplayUrl()` 对已有数据可能返回错误路径**

当前 `getDisplayUrl` 逻辑：
```
1. 如果 !isRawFile(originalPath) && 文件存在 → return file://originalPath
2. 如果 thumbnailPath 存在 → return file://thumbnailPath  (400px缩略图!)
3. 如果 isRawFile → return photoforge://raw/...
```

问题在步骤 1：对于**已有数据**（修复前导入的），`photo.filePath` 在 library.json 中可能存的是缩略图路径（而非原始文件路径）。`getDisplayUrl` 检查 `isRawFile(filePath)`——如果不是 RAW（如 HEIC），就返回 `file://filePath`，但 filePath 本身可能指向 thumbnails 目录里的文件！

另外，对于 RAW 文件，步骤 1 跳过，步骤 2 返回 `file://thumbnailPath`——这是 400px 缩略图，当然模糊。

**修复前的数据**：`photo.filePath` 存的可能是 `~/Pictures/PhotoForge_Library/thumbnails/IMG_001_thumb.jpg`，而不是原始照片路径。`getDisplayUrl` 没有检测 filePath 是否指向缩略图文件。

## 修复计划

### Task 1: 修复 extractMetadata — exifr 不应覆盖已获取的正确 width/height

**文件**: `src/main/importer.ts`

**问题**: exifr 的 `ImageWidth`/`ImageHeight` 字段在 RAW/HEIC 文件中通常是嵌入预览尺寸（160×120），不是实际像素尺寸。

**修复**:
- exifr 只用 `ExifImageWidth`/`ExifImageHeight`（这些通常是真实像素尺寸），不用 `ImageWidth`/`ImageHeight`
- 如果 sips 已经拿到 width/height，exifr 不应覆盖（sips 在 macOS 上更可靠）
- sharp 作为最终兜底，只在 width/height 仍然缺失或异常小时才使用
- 最终校验：如果 width < 500 且 height < 500，标记为可疑，不存储

### Task 2: 修复 getDisplayUrl — 检测 filePath 是否为缩略图路径

**文件**: `src/main/main.ts`

**问题**: 对于已有数据，`photo.filePath` 可能指向缩略图文件，`getDisplayUrl` 没有检测这一点，直接返回 `file://缩略图路径`。

**修复**: 在 `getDisplayUrl` 中加入缩略图路径检测，与 `exportManager.getSourcePath` 一样的逻辑：
- 如果 filePath 包含 `/thumbnails/` 或以 `_thumb.jpg` 结尾 → 尝试从 `originals/` 目录找原始文件
- 如果找不到 → 回退到缩略图（至少有图可显示）

### Task 3: 修复 getDisplayUrl — RAW 文件应优先使用 photoforge:// 协议

**文件**: `src/main/main.ts`

**问题**: 当前逻辑是 RAW 文件先检查 thumbnailPath → 返回 400px 缩略图。`photoforge://` 协议会转换为 4000px 的 JPEG，清晰得多。

**修复**: RAW 文件优先返回 `photoforge://raw/...`（高分辨率），缩略图只作为加载时的占位符。

### Task 4: 添加数据迁移 — 修复 library.json 中已有的错误 width/height

**文件**: `src/main/store.ts`

**问题**: 已导入的照片 width=160, height=120 已经写入 library.json，即使修了代码，旧数据仍然是错的。

**修复**: 在 `load()` 中添加迁移逻辑：
- 如果 photo.width < 500 或 photo.height < 500，尝试从原始文件重新提取
- 异步执行，不阻塞启动

### Task 5: 添加数据迁移 — 修复 library.json 中 filePath 指向缩略图的情况

**文件**: `src/main/store.ts`

**问题**: 已导入的照片 filePath 可能指向缩略图文件，需要修正为原始文件路径。

**修复**: 在 `load()` 中检测 filePath 是否为缩略图路径，如果是则尝试修正。

### Task 6: 修复其余渲染组件 — SearchBar、SmartAlbumView、DateGroupView 也要用 displayUrl

**文件**: 3个组件

**问题**: 这三个组件还在用 `photo.thumbnailPath` 作为 img src，没用 `photo.displayUrl`。

### Task 7: 构建验证

**命令**: `npm run build`

## 修改优先级

Task 1 + Task 2 + Task 3 是最关键的——修复数据写入和读取链路。
Task 4 + Task 5 修复已有数据。
Task 6 补齐所有显示入口。
