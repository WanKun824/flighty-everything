# 开始使用

本页更新于 2026-10-18，当前完整说明已统一到 [开发、构建与 GitHub 打包](开发与打包说明.md)，避免两份指南继续指向不同的安装包和截图版本。

```sh
git clone --branch build/ios-ui-20261018 https://github.com/wkun475-star/flighty-everything.git
cd flighty-everything
npm ci
npm run dev
```

需要仓库访问权限、Node.js >=22.13.0 和 npm。Windows 可用 `npm.cmd`。当前交付分支保留最新 UI 和文档，不改变仓库私有权限。

- [源码、IPA、当前页面截图和构建记录](../README.md)
- [开发、配置、验证与各端构建](开发与打包说明.md)
- [交付清单与已知限制](交付清单与已知限制.md)
- [模拟器逐页截图机制](../ios/qa/README.md)
- [文档与代码导航](README.md)

GitHub 仓库页面不能直接运行 IPA；未签名 IPA 需要自行签名。源码 ZIP 没有 Git 历史，重建原生资源前应按完整指南在独立解压目录初始化本地 Git 快照。

旧的 `51173f1` / 2026-09-23 构建和截图仅是历史资料，不代表本轮交付。
