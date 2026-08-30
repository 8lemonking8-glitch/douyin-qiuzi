# 抖音直播英语弹幕答题助手

Windows 直播答题桌面软件。一个 EXE 内置 Dycast Desktop（MIT）采集核心：输入抖音直播间房间号即可接收弹幕并自动判题，不需要单独运行 Dycast。

## 主播使用

1. 安装 NSIS/MSI 安装包或双击便携 EXE。
2. 在控制台“内置 Dycast 直播间连接”输入直播间 URL、房间号或抖音“复制链接”得到的整段分享文案；短链会在本机自动解析。
3. 点击“连接直播间”，顶部显示“直播间已连接”后点击“开始本题”。
4. 观众评论 `A`、`B`、`C`、`D` 即可作答；抢答模式下首位答对者加分、锁题，并按设置自动进入下一题。
5. 在抖音直播伴侣优先使用“游戏进程”采集 `Douyin Quiz Overlay`；未识别时改用“窗口”。

首次开播前可用 Mock 区域的“小明”和 A/B/C/D 验证整套判题、积分和 Overlay 动画。

## 弹幕来源

默认使用**内置 Dycast**，不需填写 WebSocket 地址。软件不会显示 Cookie 输入框，也不持久化登录凭据。

为兼容已有工作流，仍保留外部 Dycast 转发入口：`ws://127.0.0.1:17891/dycast`。接收 `WebcastChatMessage` 单对象或数组；同一 `eventId` 和同一用户同一题均不会重复计分。

## 透明 Overlay

Overlay 是真实透明、无标题栏、默认置顶和鼠标穿透的独立 Tauri 窗口。启动时窗口保持打开，确保抖音直播伴侣能在“窗口”采集列表中找到 `Douyin Quiz Overlay`；透明区域不会形成普通窗口背景。取消“Overlay 鼠标穿透”后，可拖动红色拖动条调整位置。

已验证 Windows 程序启动、透明窗口配置、本地 WebSocket 与打包流程。抖音直播伴侣是否为当前版本保留 Alpha 通道，仍需在其预览中手工确认：题卡外区域应露出底层直播画面；若被采为黑/白色，应记录采集方式和版本后再评估 Win32 layered window / DirectComposition。

## 隐私、许可证与日志

- 不保存评论内容或用户资料到日志；运行日志在 `%LOCALAPPDATA%\Douyin Live Quiz Assistant\logs\app.log`。
- 内置 Dycast Desktop 核心以 Git 子模块锁定，版权和 MIT 许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 请只在符合平台规则、拥有相应直播间管理权限的场景中使用。

## 开发

构建、子模块初始化与产物位置见 [BUILD.md](BUILD.md)。
