# 已知问题与兼容性测试

## Dycast 直播类型兼容性

测试日期：2026-08-30。

### 普通网页直播间：兼容

- 使用官方发布的 Dycast Desktop v1.4.1 Windows MSI 独立运行。
- 测试房间号：`587076826065`（网页地址格式为 `https://live.douyin.com/587076826065`）。
- 官方 Dycast 显示“房间连接成功”，并实时显示点赞等直播消息。
- 结论：Dycast 本身以及普通 `live.douyin.com/{roomNum}` 直播间链路可用。

### 曾无法网页访问的直播间：已定位为未公开

- CCCSH 手机分享短链：`https://v.douyin.com/yOSsmwA-NO4/`。
- 该链接跳转到 `webcast.amemv.com/douyin/webcast/reflow/7679782914560723758`；这个数字是内部直播场次 `room_id`，不是已经验证可供 Dycast 输入的普通网页 `roomNum/web_rid`。
- 在电脑浏览器访问时，抖音页面显示“暂时无法在该页面观看，尝试在抖音直播伴侣内观看”，没有得到普通 `live.douyin.com/{roomNum}` 地址。
- 后续确认该直播间当时没有设为公开。结论：先将直播间设为公开并开播，再从电脑浏览器取得 `live.douyin.com/{roomNum}` 连接 Dycast；不能据此判定 Dycast 不兼容。

本项目不会为此继续研究 `a_bogus`、抓取登录 Cookie、调用未公开私有接口或重新实现抖音弹幕协议。
