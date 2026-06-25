# AI 协作全局指导

> 基于社区调研和 Anthropic 官方指南整理。包含可直接粘贴的配置模板。

---

## 一、全局行为指令（直接粘贴到 Custom Instructions）

```
我的提问习惯是给出核心意图，但细节和方向不一定完整。请按以下方式和我协作：

理解优先：回答前先想清楚我真正想解决的是什么，这往往和字面描述不完全一致。

主动扩展：对我没提到但高度相关的方面，主动补上，不用等我追问。

质疑方向：如果我的思路有明显更优的替代方案，直接指出并说明理由，不要硬执行一个可能绕路的方向。

方案对比：有多种做法时，不直接选第一个。简要列出各方案的权衡，推荐最优的并说明为什么。

变更报告：每次修改或创建文件后，必须在结尾说明改了哪些文件、做了什么改动。不要等我问才说。

点到为止：补充建议聚焦在直接相关的范围内，不要过度发散。

沟通语气：像一个靠谱的合作者，不是执行命令的工具。简洁、直接、有主见。
```

放哪：Claude Desktop → Settings → Custom Instructions；Claude Code → `~/.claude/CLAUDE.md`；Cursor → `.cursorrules`

---

## 二、工具限制与解决方案

### WebSearch 不可用时

在 Custom Instructions 中追加：

```
当需要搜索信息时，不要使用 WebSearch 工具，它返回的是编造内容。请改用以下方式：
1. 用 web_fetch 直接访问已知的权威 URL（如官方文档、GitHub 仓库、博客文章）
2. 我需要你搜索某个话题时，先告诉我你会去哪些网站找，列出来，我确认后再抓取
3. 如果你不确定 URL，先用你的训练知识回答，但必须标注"未验证，建议你自己确认"
4. 不要假装搜索成功了，搜索失败就直说
```

### 有 deep-research 技能时

```
需要搜索调研时，优先使用 deep-research 技能，不要手动用 WebSearch。
深研模式用于重要调研，quick brief 用于快速了解一个话题。
```

### 其他常见问题

| 问题 | 解决方法 |
|------|----------|
| AI 只做字面意思 | 提问时加"自己把相关的都补上" |
| AI 不做方案对比 | 追问"有没有更好的方向？对比一下再做" |
| AI 遗漏边界情况 | 提问时加"考虑边界情况：空状态、加载状态、错误状态" |

---

## 三、项目级指令文件模板

来源：Anthropic 官方 `init` 技能指南 + [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) 社区最佳实践。

有效的项目指令文件包含 5 个部分（社区验证的结构）：

```markdown
# [项目名] — AI 协作规则

## 1. 角色定义
你是 [项目类型] 的资深开发者，熟悉 [技术栈]。

## 2. 项目上下文
技术栈：[一句话]
架构决策：[为什么选了 X 而不是 Y]
关键路径：[做功能 A 时必须同时改 B、C、D]

## 3. 明确禁止项
- 不要在代码中使用 placeholder（...、TODO）
- 不要吞掉错误（catch 块必须有处理逻辑）
- 不要硬编码用户可见的字符串（走 i18n）
- 不要修改 shared/types.ts 而不更新 i18n

## 4. 强制行为（收到任何需求时必须先执行）

在写任何代码之前，先输出：

1. 意图推演：用户真正想要解决什么？涉及哪些实体？
2. 关联清单：必须同时完成的所有事项（数据层/组件/i18n/测试/交互状态）
3. 方案推荐：至少 2 个方案，推荐最优方案并说明理由
4. 风险预警：高/中/低风险项

推演后自检：
- 搜索能覆盖新内容吗？
- 筛选条件需要更新吗？
- 有空状态/加载状态/错误状态吗？
- 增删改查都支持了吗？
- 这个改动会影响哪些已有功能？

## 5. 编码约定
[你的项目规范：命名、文件组织、风格等]
```

来源：[Code Guidelines rules](https://github.com/PatrickJS/awesome-cursorrules/blob/main/rules/code-guidelines-cursorrules-prompt-file/.cursorrules)、[Cursor Rules Pack v2](https://github.com/PatrickJS/awesome-cursorrules/blob/main/rules/cursor-rules-pack-v2-cursorrules-prompt-file/.cursorrules)

---

## 四、实战工作流（Harper Reed 三阶段法）

来源：[Harper Reed: My LLM codegen workflow atm](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)、[Aider tips](https://aider.chat/docs/usage/tips.html)

### 阶段一：需求梳理 → spec.md

用对话式 AI（如 ChatGPT）逐个问题深入需求：

```
Ask me one question at a time so we can develop a thorough, step-by-step spec
for this idea. Each question should build on my previous answers, and our end
goal is to have a detailed specification I can hand off to a developer.
```

对话结束后：

```
Now compile our findings into a comprehensive, developer-ready specification.
Include all requirements, architecture choices, data handling, error handling,
and a testing plan.
```

保存为 `spec.md`。

### 阶段二：规划 → prompt_plan.md + todo.md

用推理模型（o1/o3/DeepSeek R1）生成执行计划：

```
Draft a detailed, step-by-step blueprint for building this project. Break it
down into small, iterative chunks that build on each other. Review and make sure
steps are small enough to be implemented safely with strong testing, but big
enough to move the project forward. Each prompt should build on the previous
ones, and there should be no hanging or orphaned code.
```

保存为 `prompt_plan.md`，再让它输出 `todo.md`。

### 阶段三：执行

逐个 prompt 交给 Claude Code / Aider 执行。每次执行完确认测试通过再继续下一个。

### 关键原则

- **TDD 是防幻觉的最好手段**：先写测试再写实现，AI 的范围漂移会被测试卡住
- **小步迭代**：一次只做一个 prompt，不要让 AI 一口气做完所有事
- **plan-before-code**：没有 spec.md 就不要开始写代码，这是社区验证的最有效提效手段

---

## 五、提问技巧

### 公式

```
[做什么] + [为什么/背景] + [触发词]
```

### 示例

| 差 | 好 |
|----|----|
| "加智能相册" | "加智能相册，目前只有普通相册，用户无法按条件自动填充。自己把相关的都补上。" |
| "搜索不好用" | "搜索太弱了，只能匹配文件名。按推演规则展开，先给方案。" |
| "搜一下 darktable 怎么做的" | "搜一下 darktable 的搜索实现，先列你会去哪些网站找，我确认后再抓取。" |

### 触发词速查

| 你说 | AI 做什么 |
|------|----------|
| "自己把相关的都补上" | 主动扩展所有关联改动 |
| "按推演规则展开" | 走完整推演流程 |
| "先不写代码，先分析" | 先输出分析再动手 |
| "有没有更好的方向" | 质疑当前思路，推荐替代方案 |
| "对比一下再做" | 列出多个方案的权衡 |
| "考虑边界情况" | 覆盖空状态/错误状态/并发 |

---

## 六、常见误区

| 误区 | 真相 |
|------|------|
| 写得越多越好 | 50 行可执行规则 > 500 行参考文档。Anthropic 官方明确反对写冗余内容 |
| 配置一次就不管 | 项目变了，规则也要跟着更新 |
| 只靠配置不改进提问 | "自己把相关的都补上" 这 8 个字比任何配置都有效 |
| 期望 AI 100% 不遗漏 | 推演表的价值是给你一张检查清单，不是替代你思考 |
| 用 WebSearch 搜索 | 工具不可用，会返回编造内容，用 deep-research 技能或 web_fetch 代替 |
| 没有 spec 就开始写代码 | 社区共识：plan-before-code 是最有效的提效手段 |

---

## 参考来源

- [Harper Reed: My LLM codegen workflow atm](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/) — 三阶段工作流
- [Harper Reed: Basic Claude Code](https://harper.blog/2025/05/08/basic-claude-code/)
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) — 社区 .cursorrules 合集（100+ 规则集）
- [Code Guidelines rules](https://github.com/PatrickJS/awesome-cursorrules/blob/main/rules/code-guidelines-cursorrules-prompt-file/.cursorrules) — 26 条编码指南
- [Cursor Rules Pack v2](https://github.com/PatrickJS/awesome-cursorrules/blob/main/rules/cursor-rules-pack-v2-cursorrules-prompt-file/.cursorrules) — 生产环境验证的规则集
- [Aider tips](https://aider.chat/docs/usage/tips.html) — Aider 使用技巧
- Anthropic 官方 `init` 技能 — CLAUDE.md 初始化最佳实践
