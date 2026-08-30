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

- src-tauri\target\release\douyin-live-quiz.exe
- src-tauri\target\release\bundle\nsis\抖音英语答题助手_0.7.0_x64-setup.exe
