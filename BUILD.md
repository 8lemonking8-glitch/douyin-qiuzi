# 构建说明

## 开发环境

Windows 10/11、Node.js 20+、Rust stable MSVC、Visual Studio C++ Build Tools 和 WebView2 Runtime。

执行：

    npm install
    npm test
    npm run build

源码首次检出时需要初始化官方 Dycast 子模块：

    git submodule update --init --recursive

## 产物

- src-tauri\target\release\douyin-quiz-tauri-mvp.exe
- src-tauri\target\release\bundle\nsis\Douyin Live Quiz Assistant_0.6.0_x64-setup.exe
- src-tauri\target\release\bundle\msi\Douyin Live Quiz Assistant_0.6.0_x64_en-US.msi
