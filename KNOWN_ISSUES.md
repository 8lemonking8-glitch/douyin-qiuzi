# 已知问题与兼容性

## Dycast 采集

- 本软件不再内置 Dycast；必须独立运行官方 Dycast Desktop，并将其 WS 转发地址设为 `ws://127.0.0.1:17891/dycast`。
- 官方 Dycast Desktop v1.4.1 已在公开网页直播间 `587076826065` 测试成功，并收到直播互动消息。
- 直播间需设为公开且正在开播。手机短链中的内部 `room_id` 不是 Dycast 所需的网页房间号。
- 本项目不研究 `a_bogus`、登录 Cookie、未公开接口或抖音弹幕协议。

## 透明 Overlay

Overlay 是独立透明窗口。直播伴侣应优先选择“窗口”采集并选中 `Douyin Quiz Overlay`；如窗口列表中找不到，请在本软件控制台点击“显示”，再打开采集器窗口列表。
