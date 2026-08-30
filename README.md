# 抖音直播英语答题助手

Windows 直播答题桌面软件：主播控制台、透明 Overlay、排行榜和抢答判题均在本程序中运行；**直播弹幕采集由官方 Dycast Desktop 独立完成**，再通过本地 WebSocket 转发给本软件。

## 使用方法

1. 启动本软件。Overlay 会保持打开，以便抖音直播伴侣在“窗口”列表中识别 `Douyin Quiz Overlay`；控制台可随时隐藏或显示它。
2. 启动官方 Dycast Desktop，在其中输入公开且正在开播的 `live.douyin.com/房间号` 并连接。
3. 在 Dycast Desktop 右侧“WS地址”填写：`ws://127.0.0.1:17891/dycast`，点击“转发”。
4. 本软件右上角显示“Dycast 已转发”后，点击“开始本题”。观众发送 `A/B/C/D` 即可参与。

手机“复制链接”得到的 `v.douyin.com` 短链和其中的 18/19 位内部 `room_id` 不能直接作为 Dycast 房间号。请在电脑浏览器打开公开直播间后，复制地址栏中的 `https://live.douyin.com/数字`。

## 弹幕协议

本程序监听 `ws://127.0.0.1:17891/dycast`，兼容 Dycast 转发的单个 JSON 对象或 JSON 数组，重点处理 `WebcastChatMessage`。同一 `eventId`、同一用户同一题都不会重复计分。

## 架构边界

- Dycast Desktop：连接抖音直播间、采集并转发消息。
- 本软件：接收消息、标准化、判题、计分、排行榜、Overlay 和主播控制。

本软件不内置 Dycast 源码，不处理 Cookie，也不实现抖音私有直播协议。

## 构建与产物

详见 [BUILD.md](BUILD.md)。Windows 安装包、透明采集说明和已知限制见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。
