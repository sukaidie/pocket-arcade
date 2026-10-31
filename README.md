# ✳ 口袋游乐场 · Pocket Arcade

中文小游戏合集：2048、贪吃蛇、记忆翻牌、井字棋（Minimax 人机对战）。

纯 HTML / CSS / JavaScript，无构建依赖。支持移动触控、键盘与本地最高分；离开页面时贪吃蛇自动暂停。最高分只保存在当前浏览器。

## 本地运行

```sh
python3 -m http.server 8080
```

打开 http://localhost:8080。运行 `npm test` 检查合并规则和井字棋算法。

## 部署

GitHub 仓库 Settings → Pages → Source 选择 GitHub Actions。推送 main 后自动测试并发布。
