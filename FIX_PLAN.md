# Fix Plan: 图片显示分辨率始终 120×160

## Goal
修复 PhotoForge 中所有图片显示为 120×160 模糊缩略图的问题，使浏览网格和详情页显示全分辨率图片。

## Root Cause Analysis

问题不是单一原因，而是**架构设计缺陷**：`photo.thumbnailPath` 字段被同时用于两个目的——

1. **存储层面**：`store` 中的 `thumbnailPath` 存的是磁盘上的缩略图文件路径（如 `~/Pictures/PhotoForge_Library/thumbnails/IMG_001_thumb.jpg`）
2. **显示层面**：IPC 返回时 `getDisplayUrl()` 把 `thumbnailPath` **覆写**成了显示 URL（如 `file:///originals/IMG_001.jpg`），然后渲染进程用 `photo.thumbnailPath` 作为 `<img src>`

但这个覆写有两层问题：
- **问题 A**：`getDisplayUrl` 的旧逻辑优先返回 `file://thumbnailPath`（400px 缩略图），网格视图就用这 400px 图来显示。我之前的修改让它优先返回原图，但 `photo.filePath` 在 `store` 中的真实值可能就是缩略图路径（见问题 B）。
- **问题 B（核心）**：当用户以 **引用模式** (`copyToLibrary: false`) 导入照片时，`libraryFilePath = filePath`（用户原始路径），但如果原图后来被移动/删除，`getSourcePath` 会回退到 `originals/` 目录——而这个目录里可能只有缩略图。更关键的是，**120×160 明确不是 400px**，说明 `photo.filePath` 存储的就是缩略图路径本身！这意味着 `store.getPhoto()` 返回的 `filePath` 字段指向的是缩略图文件，而不是原始照片。

### 120×160 的来源

`DEFAULT_THUMBNAIL_SIZE = 400`，但 400 是 `fit: 'inside'` 的最大边。对于 3:2 横向照片，400px 宽对应 267px 高；对于 4:3 则是 300px 高。**120×160 不是缩略图生成的尺寸**。

120×160 很可能是 **EXIF 嵌入预览图的尺寸**——某些相机会在 EXIF 中嵌入一个小预览图（通常 160×120 或类似），而 sharp 在处理某些格式（HEIC/HEIF 等）时，如果没有正确解码原图，可能只提取了这个嵌入预览。

**另一种可能**：`photo.width` 和 `photo.height` 存储的就是 120 和 160——即元数据提取失败，只拿到了 EXIF 预览尺寸而非实际像素尺寸。用户看到的"分辨率 120×160"可能是信息面板上显示的元数据值。

## Approach

分两条线修复：

1. **分离 thumbnailPath 和 displayUrl**：不再覆写 `thumbnailPath`，新增 `displayUrl` 字段给渲染进程用
2. **修复元数据提取**：确保 `width/height` 拿到的是实际像素尺寸而非 EXIF 预览尺寸

## Tasks

### Task 1: 在 PhotoFile 类型中新增 `displayUrl` 字段
- 文件: `src/shared/types.ts`
- 新增 `displayUrl?: string` 字段，专供渲染进程作为 `<img src>` 使用
- `thumbnailPath` 保持为存储层面的缩略图文件路径，不再被覆写

### Task 2: 修改 IPC 返回数据，填充 displayUrl 而非覆写 thumbnailPath
- 文件: `src/main/main.ts`
- `GET_ALL_PHOTOS` / `GET_PHOTO` / `GET_PHOTO_THUMBNAIL` 中：
  - 不再覆写 `thumbnailPath`
  - 新增 `displayUrl: getDisplayUrl(...)` 字段
- `getDisplayUrl` 逻辑：
  - 非 RAW：直接返回 `file://originalPath`
  - RAW：返回 `photoforge://raw/...`（已转码的高分辨率图）
  - 仅在以上都不可用时才回退到缩略图

### Task 3: 修改渲染进程，使用 photo.displayUrl 显示图片
- 文件: `src/renderer/components/PhotoGrid.tsx`
- `<img src={photo.displayUrl || photo.thumbnailPath || ...}>`
- 文件: `src/renderer/components/PhotoDetail.tsx`
- `imageSrc` 使用 `photo.displayUrl`
- 文件: `src/renderer/components/CompareView.tsx`
- 同上

### Task 4: 修复元数据提取——确保 width/height 是真实像素尺寸
- 文件: `src/main/importer.ts`
- `extractMetadata` 中 sharp 回调改为：
  ```ts
  const info = await sharp(filePath, { failOn: 'none' }).withMetadata().metadata();
  ```
  确保 sharp 读取实际像素而非嵌入预览
- 在 sips 和 exifr 之后、sharp 之前加校验：如果 width < 500，说明可能拿到了 EXIF 预览尺寸，强制用 sharp 重新读取

### Task 5: 修复 getDisplayUrl——保证 RAW 文件也返回高分辨率
- 文件: `src/main/main.ts`
- `getDisplayUrl` 中 RAW 文件返回 `photoforge://raw/...`
- 确保 `photoforge://` 协议处理器返回足够大的图（已改为 4000px）

### Task 6: 修复 GET_PHOTO_FULL——使用 getSourcePath 而非直接 photo.filePath
- 文件: `src/main/main.ts`
- `GET_PHOTO_FULL` 当前直接用 `photo.filePath`，但如果 filePath 被存为缩略图路径就会返回缩略图
- 改为使用 exportManager 的 `getSourcePath` 逻辑（含缩略图检测和 originals/ 回退）

### Task 7: 编译验证
- `npm run build` 确认无错误

### Task 8: 打包验证
- `npm run pack` 生成 .app

## Risks
1. **library.json 中已有的错误数据**：如果已有照片的 `filePath` 指向缩略图，即使代码修好了，旧数据仍然有问题。需要在 `GET_PHOTO_FULL` 和 `getDisplayUrl` 中做运行时检测和回退。
2. **性能**：网格视图直接加载全分辨率图片可能较慢。后续可优化为延迟加载/渐进式缩略图→原图切换。当前优先保证正确显示。

## Verification
1. 构建成功（`npm run build` 无错误）
2. 信息面板中的分辨率显示正确的原始尺寸（如 5472×3648 而非 120×160）
3. 网格视图图片清晰（非模糊缩略图）
4. 详情视图图片清晰
5. 导出尺寸正确（原始尺寸）
