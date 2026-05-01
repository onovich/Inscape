# VSCode 扩展发布工作流

状态：草案

这份清单用于把“源码已改”与“用户已经在 VS Code 中看到变更”区分开。

## 标准步骤

1. 在 `tools/vscode-inscape/` 下修改扩展源码、`package.json`、README 或 schema。
2. 运行 `npm run rebuild:vsix`，生成并安装新的 `.vsix`。
3. 在 VS Code 里执行窗口 reload，或在扩展安装完成后重新打开目标工作区。
4. 如果扩展打包警告指出范围过大，优先补 `.vscodeignore`，再检查产物内容。

## 经验教训

- 仅改源码不够，必须重新打包并安装覆盖。
- 重启窗口不是发布步骤本身，它只是让已安装扩展重新加载。
- 先确认本机有 `code.cmd`，否则安装步骤会失败。
- 预览 / hover / 跳转这类功能，最好先把工作流固化，再继续扩功能。

## 当前命令

```powershell
cd tools\vscode-inscape
npm run rebuild:vsix
```
