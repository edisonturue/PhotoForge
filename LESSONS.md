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
