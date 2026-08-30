# 构建说明

## 已验证的本机构建

执行过：`npm install`、`npm test`、`npm run build`。构建目标为 Windows x64 的 EXE、NSIS 和 MSI。

## 开发环境要求

- Windows 10/11、WebView2 Runtime
- Node.js 20+
- Rust stable MSVC、Visual Studio C++ Build Tools

当前仓库的 `build-windows.bat` 会安装 npm 依赖、运行游戏引擎测试并打包。Rustup 新安装后如终端找不到 `cargo`，关闭并重新打开终端，或临时执行：

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

然后运行：

```powershell
npm install
npm test
npm run build
```

产物位置：

- `src-tauri\target\release\douyin-quiz-tauri-mvp.exe`
- `src-tauri\target\release\bundle\nsis\Douyin Live Quiz Assistant_0.3.0_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\Douyin Live Quiz Assistant_0.3.0_x64_en-US.msi`

## 手工透明验收

启动 EXE 后，Overlay 应是无边框透明窗口，题卡之外没有 HTML 背景。控制台默认开启鼠标穿透；取消勾选“Overlay 鼠标穿透”后可通过红色拖动条改变位置，恢复勾选后不会挡住直播伴侣操作。使用抖音直播伴侣逐一验证“游戏进程”和“窗口”采集，分别记录 Alpha 区域是否透明。
