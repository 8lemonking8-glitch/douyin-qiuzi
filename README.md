# 抖音直播英语答题助手

Windows 直播答题桌面软件：主播控制台、透明 Overlay、排行榜、抢答判题与 Dycast 弹幕接入均在同一个程序中运行。

## 连接直播间

1. 双击 EXE 或安装包启动软件。
2. 在“连接直播间”中输入公开网页直播间地址，例如 https://live.douyin.com/587076826065，或直接输入网页房间号。
3. 点击“连接直播间”；状态显示“内置 Dycast 已连接”后，即可点击“开始本题”。
4. 观众发送 A/B/C/D 参与答题。
5. 在抖音直播伴侣选择“窗口”，并选择 Douyin Quiz Overlay。

手机“复制链接”产生的 v.douyin.com 短链、以及其中的 18/19 位内部 room_id，不能使用。请在电脑浏览器打开公开直播间，再复制地址栏中的 live.douyin.com/数字。

## 规则

- 内置 Dycast 使用固定版本的官方 Dycast Desktop 核心；项目不自行设计或维护抖音弹幕协议。
- 重点处理 WebcastChatMessage；相同 eventId 和同一用户同一题不会重复计分。
- 支持抢答自动、倒计时和手动模式。
- 题库位于 web/questions.json，已在打包时校验进入最终前端资源。

Overlay 为单独透明窗口，启动时默认离屏（移出屏幕外，主播桌面不可见，但仍可被直播伴侣采集）；需预览或调整位置时，取消勾选控制台的“Overlay 离屏”。

## 构建

参见 [BUILD.md](BUILD.md)。已知限制与透明采集说明见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。
