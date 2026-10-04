# ContextClip 1.0.1 — 发布交付说明

原始代码来自用户提供的 context-clip-v1.0.0.zip。此版本基于该源码修复并验证。

## 交付文件

- `context-clip-v1.0.1-chrome.zip`：浏览器运行和商店上传用；manifest.json 位于根目录。
- `context-clip-v1.0.1-source.zip`：含代码、开发依赖锁文件、测试、打包脚本和开源文档。
- `SHA256SUMS.txt`：校验下载文件完整性。

先解压 chrome 包，在 chrome://extensions/ 开启开发者模式，点击“加载已解压的扩展程序”，选择包含 manifest.json 的目录。

## 验证范围

Node 测试覆盖正文提取、基础 Markdown、首次后台注入、设置传递、复制完成等待及失败反馈。

Chromium 测试使用发布版 manifest，通过工具栏动作授予 activeTab；验证真实后台提取、剪贴板、选区、相对链接、代码空白、列表、表格、设置保存、弹窗控制器和 Markdown 下载。无头环境中弹窗文档以标签页打开，因此系统快捷键派发、原生右键菜单点击和工具栏弹窗位置仍需在个人浏览器中手工确认。

## 收款状态

赞助入口已实现，尚未填入已启用的个人赞助主页，因此默认隐藏。需要本人在收款平台完成注册、地区资格验证及私密绑卡，再提供可公开的 HTTPS 赞助主页链接。

银行卡号不是赞助主页地址；当前源码、压缩包、隐私文档及 FUNDING.yml 不存储银行卡信息。不要把手册中的示例钱包地址复制为个人收款地址。

## GitHub 发布目标

公开仓库：https://github.com/zunajumo06-cmd/context-clip 。项目描述：

> Copy webpage content as clean Markdown for ChatGPT, Claude, Cursor and Gemini, with preview and token estimates.

建议 Topics：chrome-extension, markdown, llm, chatgpt, claude, cursor, developer-tools, productivity。

源码包包含 MIT 许可证、英文 README、CHANGELOG、贡献指南和 FUNDING 模板。源码及 v1.0.1 下载包发布至上述仓库；node_modules、测试产物和本地账号配置不纳入发布包。

## Chrome Web Store 文案草稿

Title: ContextClip: LLM-Ready Web Markdown Clipper

Short description:

> Copy webpage content as clean Markdown for ChatGPT, Claude, Cursor and Gemini. Includes preview and token estimates.

Detailed description:

> ContextClip helps you bring webpage content into your AI workflow as Markdown. Preview the extracted text, copy it to the clipboard, or download a Markdown file.
>
> It supports headings, lists, GFM tables, fenced code blocks, links and optional images. Copy a full page or selected text, and choose optional prompt prefixes for summaries, technical questions or simple explanations. Token counts are estimates and may differ from your model's tokenizer.
>
> Extraction happens in your browser. The extension has no analytics or remote extraction service. Preferences may synchronize through Chrome's storage sync. Optional sponsorship links open third-party sites only when clicked.
>
> Browser-internal and other protected pages are unavailable. Extraction is heuristic; review important output before use.

权限用途见 README.md；隐私政策草稿见 PRIVACY.md。商店上架前还需要开发者账号、发布者真实支持联系方式、公开可访问的隐私政策 URL、符合商店尺寸要求的截图和实际数据使用声明。审核时长和规则以提交时官方信息为准。

## 社区推广草稿

Show HN title:

> Show HN: ContextClip — Copy webpage content as Markdown for LLMs

Body:

> Hi HN! I built ContextClip to turn article content into Markdown for AI workflows. It includes a preview, clipboard copy, Markdown download, selected-text extraction and approximate token counts. Page conversion runs in the browser; preferences use Chrome storage sync. It is free and MIT-licensed. Extraction is heuristic, and I would appreciate examples of pages where it can improve. Repository: https://github.com/zunajumo06-cmd/context-clip.

上述为草稿，尚未向任何社区发送。发布前核对各社区自推规则。
