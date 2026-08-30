# 构建说明

## 环境

Windows 10/11、Node.js 20+、Rust stable MSVC、Visual Studio C++ Build Tools 和 WebView2 Runtime。

```powershell
npm install
npm test
npm run build
```

也可以双击 `build-windows.bat`。Dycast Desktop 不再作为源码子模块或安装包内容；请单独安装官方发布版本。

## 产物

- `src-tauri\target\release\douyin-quiz-tauri-mvp.exe`
- `src-tauri\target\release\bundle\nsis\Douyin Live Quiz Assistant_0.5.0_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\Douyin Live Quiz Assistant_0.5.0_x64_en-US.msi`
