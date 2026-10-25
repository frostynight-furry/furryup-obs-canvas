# FurryUP OBS Canvas

[English](README.en.md) · MIT · **0.2.0 预览版**

由[夜霜（FrostyNight）](https://github.com/frostynight-furry)发起并维护，源自 FurryUP Studio 的通用画布组件。

- **主播想直接使用完整产品：** [了解 FurryUP Studio](https://frostynight.top/furryup) · [下载安装包](https://github.com/frostynight-furry/furryup-studio-releases)。
- **开发者想体验或集成组件：** [立即体验](#立即体验) · [集成文档](docs/INTEGRATION.md)。

在一个画布中摆放互动模块，OBS 只添加一个透明浏览器源。提供横屏 **1920×1080**、竖屏 **1080×1920** 两套独立布局，拖动、缩放、层级排序、显示/锁定、撤销与显式应用。

从 FurryUP Studio 的画布编辑器拆分，包含独立本机示例服务。七种基础模块和一个可扩展状态模块使用**合成展示内容**：没有直播平台采集、音乐账号、实际点歌或礼物业务逻辑。**真实直播持续运行尚未验收**，不是经过实播验证的稳定发行版。

## 立即体验

需要 Node.js 22.12 或更新版本，无需安装 npm 依赖：

```sh
node scripts/verify.cjs
node examples/server.cjs
```

1. 打开终端打印的编辑器链接。
2. 选择横屏或竖屏，在左侧拖动/缩放模块；右侧调整层级、显示和锁定。
3. 点击「应用到直播」，再点击「复制当前画布源」。示例中的“直播”指本机输出页面。
4. OBS 添加浏览器源，粘贴地址，并使用对应的 1920×1080 或 1080×1920 尺寸。

只有点击应用才改变输出；未应用的编辑是本地草稿。编辑页面刷新会丢弃草稿，已应用的两套布局会保存。单源只承载画面，不携带音乐或麦克风声音。

## 示例服务范围

- 默认监听 `127.0.0.1:17866`，不会连接 FurryUP Studio 或修改现有 OBS 场景。
- 编辑和只读输出使用不同的随机访问密钥；跨来源写入被拒绝，数据不通过外部 CDN。
- 布局默认保存在系统临时目录的 `furryup-obs-canvas-example/layout.json`。可通过环境变量 `CANVAS_DATA_FILE` 指定持久文件，`PORT` 改端口。
- 每次重启服务生成新链接，需要重新复制到 OBS；已应用布局保留。示例不实现正式产品的账号、长期凭据或公网部署。
- 输出只创建固定白名单的同源 iframe；单条 SSE 连接向子模块分发事件，断开会清除过期画面。
- 支持注册 1～21 个可信模块及其事件，示例增加一个默认隐藏的「状态示例」。旧布局保留，新模块从隐藏开始；非法或已删除的模块不会被静默丢弃。
- 「检查输出连接」显示横竖屏输出连接和旧脚本状态。连接包含普通浏览器；勾选模块不等于 OBS 已接入。升级后请刷新 OBS 浏览器源页面缓存，重启示例服务后还需重新复制地址。

接入自己的宿主和模块见 [INTEGRATION.md](docs/INTEGRATION.md)。拖放复用离线固定版 interact.js 1.10.28，MIT 许可证及哈希见 [第三方说明](THIRD_PARTY_NOTICES.md)。`private: true` 防止误发 npm，不影响从 GitHub 使用 MIT 源码。

本仓库只发布画布组件及示例，不是 FurryUP Studio 主程序、完整直播工作台或桌面更新包。

## 关于夜霜与 FurryUP Studio

[夜霜（FrostyNight）](https://github.com/frostynight-furry)是本项目的发起者和维护者。[FurryUP Studio](https://frostynight.top/furryup)面向希望直接使用直播工具的主播，将工作台、互动输出和相关插件整合到统一界面，提供桌面安装与更新流程。具体功能和版本以[产品发行说明](https://github.com/frostynight-furry/furryup-studio-releases)为准。

本仓库面向需要自行集成的开发者，可独立运行。它由现有画布实现拆分，独立源码发布不会自动回接或更新桌面产品；完整产品、账户服务、业务内容与素材也不因本组件采用 MIT 而一并开放。

## 自愿致谢

如果本项目帮助了你，欢迎在项目 README、文档或关于页提及来源。以下示例可以直接复制，也可按实际使用情况调整：

```markdown
本项目的画布功能使用了 [FurryUP OBS Canvas](https://github.com/frostynight-furry/furryup-obs-canvas)，由[夜霜（FrostyNight）](https://github.com/frostynight-furry)发起并维护。完整主播端产品见 [FurryUP Studio](https://frostynight.top/furryup)。
```

上述致谢与链接完全自愿，不增加 [MIT 许可证](LICENSE)的条件。使用和分发代码时，仍须按许可证保留原版权与许可声明；interact.js 等第三方组件继续遵循各自许可和[第三方说明](THIRD_PARTY_NOTICES.md)。致谢不代表你的项目获得夜霜或 FurryUP 的官方背书。
