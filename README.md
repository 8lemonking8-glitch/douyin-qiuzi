# 抖音直播英语弹幕答题助手

Windows 桌面软件：主播用控制台出题，观众在抖音直播间发送 `A/B/C/D` 作答；独立透明 Overlay 可由抖音直播伴侣采集。

## 安装与启动

面向主播只需要安装，不需要 Node.js 或 Rust：

1. 优先运行 `Douyin Live Quiz Assistant_0.3.0_x64-setup.exe` 完成安装；也可直接双击便携版 `douyin-quiz-tauri-mvp.exe`。
2. 启动后会出现控制台和标题为 **Douyin Quiz Overlay** 的透明窗口。
3. 控制台点击“开始本题”，可先以 Mock 用户“小明”点击 A/B/C/D 验证流程。

## Dycast 配置

在 Dycast / Dycast Desktop 的 WebSocket 转发目标中填写：

`ws://127.0.0.1:17891/dycast`

程序接收 `WebcastChatMessage` 单对象或 JSON 数组。它只读取消息 ID、用户 ID、昵称、头像和评论文本；不使用 Cookie、不抓取抖音协议。

示例：

```json
{"id":"7649725129967285311","method":"WebcastChatMessage","user":{"id":"123456","name":"小明"},"content":"A"}
```

## 直播伴侣采集与透明测试

在抖音直播伴侣中，先尝试“游戏进程”采集并选择 `Douyin Quiz Overlay` / 本程序；没有识别时再尝试“窗口”采集。确认预览中只有题卡、排行榜和答对卡片可见，题卡外区域能透出底层直播画面。

本版本实际验证了 Windows Tauri 配置和运行时窗口：`transparent: true`、无标题栏、无阴影、始终置顶、鼠标穿透，以及应用可启动并接收本地 WebSocket。**是否能由某个具体版本的抖音直播伴侣保留 Alpha 通道，必须在该软件预览中人工验证；当前开发环境没有直播伴侣，不能将此项标为已实际采集成功。** 如果透明区域被采成黑/白色，请记录采集模式和版本，不要改走 OBS；下一步应评估 Win32 layered window / DirectComposition 路线。

## 功能

- 默认抢答自动模式：首位答对者加分、锁题、3 秒后下一题。
- 倒计时和手动模式；可设置时长、自动切题延迟和分数。
- 同一用户同题只取首次有效回答；同一个 `eventId` 最多处理一次。
- Top 5 实时排行榜、答案公布、暂停、前后切题、重新开始和清空排行榜。
- 独立 JSON 题库：`web/questions.json`。未来可在此基础增加 JSON/Excel 导入和题库切换。
- 运行日志：`%LOCALAPPDATA%\Douyin Live Quiz Assistant\logs\app.log`（不记录评论内容和用户资料）。

## 已知限制

- 尚未实现题库导入界面、积分/设置持久化及安装包签名。
- Overlay 的真实透明采集兼容性取决于抖音直播伴侣的版本和采集模式，需按上述步骤人工验收。
- Dycast 断开不会导致程序退出；控制台状态会显示连接数，重新连接后可继续使用。

开发与重新打包请见 [BUILD.md](BUILD.md)。
