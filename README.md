# 抖音直播英语答题助手

Windows 直播答题桌面软件：主播控制台、透明 Overlay、排行榜、抢答判题都在同一个程序中运行。

## 弹幕接入

本版本提供两条 Dycast 路径：

1. 内置 Dycast：在控制台输入公开网页直播间地址（例如 https://live.douyin.com/587076826065）或网页房间号，点击“连接直播间”。
2. 官方 Dycast Desktop 转发（备用）：在官方 Dycast Desktop 连接公开直播间，将 WS 地址设置为 ws://127.0.0.1:17891/dycast，再点“转发”。

内置方式复用官方 Dycast Desktop 的固定版本核心；项目不自行设计或维护抖音弹幕协议。内置连接出现错误时，控制台会显示具体原因；主播可立即切换到独立 Dycast Desktop 转发方式。

手机“复制链接”产生的 v.douyin.com 短链、以及其中的 18/19 位内部 room_id，不能作为网页房间号使用。请在电脑浏览器打开公开直播间，再复制地址栏中的 live.douyin.com/数字。

## 使用方法

1. 双击 EXE 或安装包启动软件。
2. 在“Dycast 连接”卡片里选择内置连接，或配置官方 Desktop 转发。
3. 连接状态显示成功后，点击“开始本题”。
4. 观众发送 A/B/C/D；抢答模式下第一个答对的观众加分并在 Overlay 显示。
5. 在抖音直播伴侣选择“窗口”，并选择 Douyin Quiz Overlay。

Overlay 为单独透明窗口，启动时保持打开，以便被直播伴侣的窗口列表识别；控制台可随时显示或隐藏它。

## 规则与兼容

- 接收单个 JSON 对象或 JSON 数组。
- 重点处理 WebcastChatMessage；相同 eventId 和同一用户同一题不会重复计分。
- 支持抢答自动、倒计时和手动模式。
- 题库位于 web/questions.json，已在打包时校验进入最终前端资源。

## 构建

参见 [BUILD.md](BUILD.md)。已知限制与透明采集说明见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。
