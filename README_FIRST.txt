抖音直播答题助手 Tauri MVP

本版用途：验证“透明 EXE 窗口 + 抖音直播伴侣采集”，并测试自动抢答。

注意：这个 ZIP 是完整 Tauri 工程源码。当前生成环境不是 Windows，无法可靠产出已经验证的 Windows EXE。

Windows 构建：
1. 安装 Node.js 20+
2. 安装 Rust (rustup)
3. 安装 Microsoft Visual Studio Build Tools（Desktop development with C++）
4. 双击 build-windows.bat

编译完成后 EXE 位于：
src-tauri\target\release\douyin-quiz-tauri-mvp.exe

Dycast 转发地址：
ws://127.0.0.1:17891/dycast

直播伴侣：添加素材 -> 游戏进程 -> 选择 Overlay / 本程序。
