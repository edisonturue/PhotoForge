# PhotoForge Lessons

## 条目

### 1. 主题方案不能只落颜色 token | 🔴新规则 | 前端/UI
- 问题：用户选择了复古绿 UI 方案 C，但实际界面仍像方案 A，因为颜色已经是 vintage，按钮边框、分隔线、卡片外框和多层 panel 结构仍保留旧方案的线框语言。
- 根因：把“方案 C”理解成调色盘，没有把它转译成可观察的结构对象：默认按钮无描边、普通卡片无外框、区域靠块面/留白/阴影分组、输入/危险/选中态才保留必要边界。
- 正确解法：主题落地必须同时改 palette + chrome density + border policy + divider policy；验证时截图对比第一屏、设置页、预设页，并扫描 `borderBottom` / `borderTop` / 默认 `1px solid borderLight` 残留。
- 预防验证：UI 方案切换后，运行截图和源码扫描双验证；不能只看 `settings.theme` 或 theme token 值。
- 出现次数：1

### 2. 打包产物不等于已安装应用 | 🔴新规则 | 发布/验证
- 问题：项目里的 `release/mac-arm64/PhotoForge.app` 已经是新版，但 `/Applications/PhotoForge.app` 仍是旧包，用户从 Applications 打开时看到的还是旧界面。
- 根因：只完成了构建/打包，没有把新版 bundle 同步到 `/Applications`；验证也只看项目产物，没有读取实际启动应用的路径、`app.asar` hash 和运行进程。
- 正确解法：需要用户打开正式应用时，执行 `npm run pack` 后替换 `/Applications/PhotoForge.app`，并用 `shasum` 对比主二进制和 `Contents/Resources/app.asar` 的前后值。
- 预防验证：交付前从 `/Applications/PhotoForge.app` 启动，确认进程 `args` 指向 `/Applications/PhotoForge.app/Contents/MacOS/PhotoForge`，并用 `lsof` 确认加载的是 `/Applications/PhotoForge.app/Contents/Resources/app.asar`。
- 出现次数：1

### 3. 组件对齐必须追溯三层面板链 | 🟡补充 | 布局/对齐
- 问题：侧边栏筛选行（rowBtn）用 12px padding，而侧边栏标题和其他内容用 16px padding，导致 4px 偏移；PresetPanel 右边距 16px 与工具条 12px 不匹配；内容区与侧边栏无间隔。
- 根因：组件级 padding 各自声明，未追溯三层对齐链：外层容器Padding → 中间面板边距 → 组件内边距。Sidebar/工具栏/面板的 padding 可能不同。
- 预防：修改任何侧边栏/面板/工具栏时，追踪三层的水平对齐链，逐层对比。（1）窗口容器水平 padding；（2）flex gap 容器间隔；（3）组件内部 padding。三者合成后，左侧红绿灯/导航栏/筛选文本/列表项的 left 视觉边缘应在同一直线。
- 验证：截图用辅助线比较红绿灯左边缘、导航栏标签左边缘、侧边栏"Filter"文本、筛选列表项，确认在同一直线。
- 出现次数：1

### 4. 三层水平对齐链 | 🟡补充 | 布局/对齐
- 问题：交通灯、模块标签、侧边栏 section 三者未对齐。根因是交通灯/标签组有 4px 内部 padding 推伸，但侧边栏没有。
- 解法：对齐链必须追溯三层——外层容器 padding、中间组 padding、内部内容边缘。要么全部加组内 padding，要么全部不加。推荐：统一去掉组内 padding 并统一外层 padding。
- 验证：用临时 border 标记所有 bgSecondary 容器的可见边缘，确认左边缘在同一直线。
- 出现次数：2

### 5. 选择模式需要 manageMode 门控 | 🟡补充 | 交互/选择
- 问题：照片卡片右上角勾选/选中覆盖层默认始终可通过悬停+点击触发，但用户期望只有在主动进入"选择模式"后才能勾选，正常模式点击直接打开详情。
- 解法：新增 manageMode 状态开关，工具栏添加选择/取消按钮。PhotoGrid 根据 manageMode 切换点击逻辑。退出选择模式自动清空 selectedIds。
- 验证：切换"选择"按钮后，勾选圈才出现。正常模式点击照片进入详情。
- 出现次数：1

### 6. checkbox 勾选样式：不填充方块 | 🟢已修复 | UI/样式
- 问题：全局 CSS checkbox `:checked::after` 使用白色填充方块，用户反馈不喜欢这种"绿色填充方块"效果。
- 解法：改用 CSS border-checkmark 技巧（`border-width: 0 2px 2px 0` + `rotate(45deg)`），配合 `accentLight` 浅背景 + `accent` 边框。不再是填充方块。
- 验证：勾选导入弹窗的 checkbox，显示为 accent 色 checkmark 勾，无填充方块。
- 出现次数：1
