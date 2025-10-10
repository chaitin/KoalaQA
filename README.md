<h1 align="center">KoalaQA</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.22%2B-00ADD8.svg" alt="Go" />
  <img src="https://img.shields.io/badge/React-18.0%2B-61DAFB.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8.3%2B-3178C6.svg" alt="TS" />
  <img src="https://img.shields.io/badge/Docker-支持-2496ED.svg" alt="Docker" />
</p>



<p align="center">
  <a target="_blank" href="https://koalaqa.docs.baizhi.cloud/welcome">📖 产品文档</a> &nbsp;
</p>


## 👋 项目介绍
**KoalaQA** 是一款 AI 大模型驱动的开源售后服务社区，提供 **AI 回答、AI 搜索、AI 运营**等能力，帮助你快速落地**售后客服、社区问答、自助服务**等场景，帮助团队显著降低人工运营成本、提升客户满意度与响应效率，助力实现 ZCR（Zero Contact Resolution）目标。

## 🔥 功能与特色
- **AI 智能回答**：基于大模型实时解答用户提问，结合持续训练的知识库，提供高准确率回复，支持无缝转人工。
- **AI 自动运营**：自动归纳高质量问答、生成标准化知识条目与运营内容，降低人工运营成本。
- **AI 语义搜索**：面向语义的检索与重排，跨文档快速匹配相关答案，提升搜索命中率与可读性。
- **AI 辅助创作**：基于采纳答案与历史内容，自动生成 FAQ 等素材。

## 📢 快速上手

### 安装 KoalaQA
你需要一台支持 Docker 20.x 以上版本的 Linux 系统来安装 KoalaQA。

使用 root 权限登录你的服务器，然后执行以下命令。

```
bash -c "$(curl -fsSL https://release.baizhi.cloud/koala-qa/manager.sh)"
```

根据命令提示的选项进行安装，命令执行过程将会持续几分钟，请耐心等待。

> 关于安装与部署的更多细节请参考 [安装 KoalaQA](https://koalaqa.docs.baizhi.cloud/node/01994d00-20bd-778f-9763-f111e6858fca)。

### 访问 KoalaQA

安装完成后，你的终端会输出以下内容。

```
SUCCESS  控制台信息:
SUCCESS    访问地址(内网): https://*.*.*.*:443
SUCCESS    访问地址(外网): https://*.*.*.*:443
SUCCESS    用户名: admin
SUCCESS    邮箱: admin@email.com
SUCCESS    密码: **********************
```

使用浏览器打开上述内容中的 “访问地址”，即可访问  KoalaQA 。点击右上角登录按钮，使用上述内容中的 “邮箱” 和 “密码” 登录即可。

### 配置 AI 模型
> KoalaQA 是由 AI 大模型驱动的用户社区，在使用之前请先接入 AI 大模型，否则将无法正常使用。

首次登录时会提示需要先配置 AI 模型，关于大模型的更多配置细节请参考 [接入 AI 模型](https://koalaqa.docs.baizhi.cloud/node/019951c1-1700-7e4e-a3a8-b6997d1e5eab)。

> 推荐使用 [百智云模型广场](https://baizhi.cloud/) 快速接入 AI 模型，注册即可获赠 5 元的模型使用额度。

### 导入知识学习
在 KoalaQA 的智能机器人场景中，大模型会从知识库检索相关内容，基于检索结果进行归纳总结并给出回答，保证内容边界。更多关于知识学习的细节可参考 [知识学习 - AI 知识库](https://koalaqa.docs.baizhi.cloud/node/019951c2-e49b-7ea5-9f75-74f3851d53dd)

### 完成！访问社区使用
如果你顺利完成了以上步骤，那么恭喜你，属于你的 KoalaQA 搭建成功，接下来你可以：
- 持续完善你的 AI 知识库 
- 配置社区登录注册方式 
- 配置社区动态通知提醒 

## 🙋‍♂️ 贡献

欢迎提交 [Pull Request](https://github.com/chaitin/KoalaQA/pulls) 或创建 [Issue](https://github.com/chaitin/KoalaQA/issues) 来帮助改进项目。

## 📝 许可证

本项目采用 GNU Affero General Public License v3.0 (AGPL-3.0) 许可证。这意味着：

- 你可以自由使用、修改和分发本软件
- 你必须以相同的许可证开源你的修改
- 如果你通过网络提供服务，也必须开源你的代码
- 商业使用需要遵守相同的开源要求

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=chaitin/KoalaQA&type=Date)](https://www.star-history.com/#chaitin/KoalaQA&Date)
