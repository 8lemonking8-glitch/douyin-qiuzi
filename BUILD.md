# 构建说明

## 首次克隆

内置 Dycast 通过 Git 子模块纳入项目，必须递归克隆：

```powershell
git clone --recurse-submodules https://github.com/8lemonking8-glitch/douyin-qiuzi.git
```

如果已经克隆过仓库：

```powershell
git submodule update --init --recursive
```

## 环境与命令

需要 Windows 10/11、WebView2 Runtime、Node.js 20+、Rust stable MSVC 和 Visual Studio C++ Build Tools。

```powershell
npm install
npm test
npm run build
```

`npm run build` 先由 Vite 编译答题 UI 和 Dycast 前端核心，再由 Tauri 打出 Windows 包。`build-windows.bat` 执行同样流程。

## 产物

- `src-tauri\target\release\douyin-quiz-tauri-mvp.exe`
- `src-tauri\target\release\bundle\nsis\Douyin Live Quiz Assistant_0.4.3_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\Douyin Live Quiz Assistant_0.4.3_x64_en-US.msi`

## 回归检查

构建后应启动 EXE，输入一个合法的 `live.douyin.com/数字` 网页房间号并点击“连接直播间”。同时确认 `v.douyin.com` 手机分享短链会显示明确的格式错误，而不会被误当作房间号。无直播间可使用 Mock 区域验证游戏规则。使用抖音直播伴侣测试“游戏进程”与“窗口”两种采集模式，确认透明区域没有黑/白底。
