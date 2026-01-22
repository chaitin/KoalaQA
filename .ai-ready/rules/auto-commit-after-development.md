# Auto Commit After Development Rule

在每完成一轮开发任务后，自动整理 commit message，将相关改动提交并 push 到远端仓库。

## 触发条件

当完成以下类型的开发任务时，需要执行自动提交和推送：

1. 代码功能开发（新增功能、修改功能）
2. Bug 修复
3. 代码重构
4. 测试代码添加或修改
5. 文档更新
6. 配置文件修改

## 执行步骤

1. **查看改动状态**
   ```bash
   git status
   ```

2. **查看改动详情**
   ```bash
   git diff
   ```

3. **查看最近的提交历史**（用于保持提交信息风格一致）
   ```bash
   git log --oneline -5
   ```

4. **整理 commit message**
   - 遵循现有项目的提交信息风格
   - 使用简洁清晰的语言描述改动内容
   - 推荐格式：`type: description`，其中 type 可以是：
     - `feat`: 新功能
     - `fix`: Bug 修复
     - `refactor`: 代码重构
     - `docs`: 文档更新
     - `test`: 测试相关
     - `chore`: 构建/工具链相关

5. **暂存改动**
   ```bash
   git add <相关文件>
   ```

6. **提交改动**
   ```bash
   git commit -m "commit message"
   ```

7. **推送到远端仓库**
   ```bash
   git push
   ```

## 注意事项

- 如果改动涉及 `.monkeycode` 或 `.monkeycode-ai` 目录，优先遵循对应的自动提交规则
- 如果推送失败，先执行 `git pull` 解决冲突后再推送
- 如果任务中途失败，根据实际情况决定是否提交部分完成的改动
- 提交信息应准确反映改动的本质，而非改动的实现细节
