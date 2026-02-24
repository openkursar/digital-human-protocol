<div align="center">

# 数字人协议 (DHP)

### 自主 AI Agent 的开放协议

定义、发布和运行**数字人**——可在后台稳定运行的生产级 AI Agent。

[![GitHub Stars](https://img.shields.io/github/stars/openkursar/digital-human-protocol?style=social)](https://github.com/openkursar/digital-human-protocol/stargazers)
[![协议许可: CC0](https://img.shields.io/badge/协议-CC0%201.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![示例许可: MIT](https://img.shields.io/badge/示例-MIT-blue.svg)](https://opensource.org/license/mit)
[![注册表](https://img.shields.io/badge/注册表-在线-brightgreen.svg)](https://openkursar.github.io/digital-human-protocol/index.json)

[快速开始](#快速开始) · [字段参考](../spec/app-spec.md) · [示例](#示例) · [发布](#发布数字人) · **[English](../README.md)**

</div>

---

## 为什么是 DHP？

今天很多 AI Agent 仍是一次性脚本：难共享、难复用、难审查、难稳定运行。

DHP 解决的是标准化问题：

| 没有协议 | 使用 DHP |
|---|---|
| Prompt、脚本分散在各处 | 一个 `spec.yaml` 定义完整行为 |
| 运行行为不可预期 | 触发、记忆、输出、依赖全部显式声明 |
| 分发和安装不统一 | 统一包格式 + 注册表分发 |
| 质量难做工程化审查 | 标准字段 + 自动校验流程 |

> 可以把 DHP 理解为“自主 Agent 的协议层”，就像 MCP 之于 AI 工具互操作。

---

## 什么是数字人？

数字人是由单个 `spec.yaml` 描述的自主 AI Agent。

它可以定时运行、响应事件、浏览网页、读写文件、跨次记忆、发送通知，并在需要人工判断时发起升级（escalation）。

```
spec.yaml  ->  安装  ->  自动运行  ->  通知用户
```

DHP **与运行时解耦**：spec 定义“做什么、何时做”，运行时负责“如何执行”。

**兼容运行时：** [Halo](https://halo.app)

---

## 快速开始

复制以下内容到 `spec.yaml` 并安装。该 Agent 每天早上 08:00 发送 Hacker News 摘要。

```yaml
spec_version: "1"
name: "HN 每日简报"
version: "1.0.0"
author: "your-name"
description: "每天早上整理 Hacker News 热门讨论，并发送邮件摘要。"
type: automation
icon: "news"

system_prompt: |
  你是一位关注技术动态的分析师，每天阅读 Hacker News。

  每次运行：
  1. 打开 https://news.ycombinator.com，找出按分数排名前 10 的帖子。
  2. 对每篇帖子，阅读标题、原文链接（如可访问）和高赞评论。
  3. 撰写摘要，包含：
     - 每条帖子一句话总结
     - 最有价值的评论或反驳观点
     - 对最重要的 2-3 条帖子补充“为何值得关注”
  4. 输出为适合邮件阅读的纯文本。
  5. 调用 report_to_user(type="run_complete")，将摘要写入 summary。

  语言精炼，避免空话。3 分钟内可读完。

requires:
  mcps:
    - id: ai-browser
      reason: "读取文章页面和 HN 评论区"

subscriptions:
  - id: morning-digest
    source:
      type: schedule
      config:
        cron: "0 8 * * *"

config_schema:
  - key: email
    label: "收件邮箱"
    type: email
    required: true
    description: "摘要发送到哪个邮箱"

output:
  notify:
    system: true
    channels:
      - email

store:
  slug: "hn-daily-brief"
  category: news
  tags: ["hn", "tech", "digest", "daily"]
  locale: zh-CN
  license: MIT
```

---

## 核心能力

<table>
<tr>
<td width="50%">

### 可预测触发
支持 schedule、file、webhook、custom 等触发源。

### 持久化记忆
通过 `memory_schema` 在多次运行之间保持上下文。

### 人机协同升级
关键风险点可暂停并向用户提问。

</td>
<td width="50%">

### MCP 原生依赖
用 `requires.mcps` 挂接浏览器、数据库、API 等能力。

### 多渠道通知
系统通知、邮件、企业微信、钉钉、飞书、Webhook。

### 注册表分发就绪
通过 store 元数据直接发布可复用 Agent。

</td>
</tr>
</table>

---

## App 类型

| 类型 | 描述 | 必填字段 |
|---|---|---|
| `automation` | 后台自治运行 | `system_prompt`, `subscriptions` |
| `skill` | 用户主动调用 | `system_prompt` |
| `mcp` | MCP 服务器封装 | `mcp_server` |
| `extension` | UI 扩展/主题 | 无 |

---

## 示例

| 示例 | 说明 |
|---|---|
| [`examples/minimal/`](../examples/minimal/) | 生产级最小 automation 案例 |
| [`examples/price-hunter/`](../examples/price-hunter/) | 生产级复杂案例（memory/filter/escalation/多通知） |

可安装包目录：[`packages/digital-humans/`](../packages/digital-humans/)

---

## 文档导航

- **完整字段规范：** [`spec/app-spec.md`](../spec/app-spec.md)
- **包格式说明：** [`spec/package-format.md`](../spec/package-format.md)
- **注册表协议：** [`spec/registry-protocol.md`](../spec/registry-protocol.md)
- **分类枚举：** [`spec/categories.md`](../spec/categories.md)
- **贡献指南：** [`CONTRIBUTING.md`](../CONTRIBUTING.md)

---

## 发布数字人

```bash
# 1) 创建包目录
mkdir -p packages/digital-humans/my-agent

# 2) 编写 spec
$EDITOR packages/digital-humans/my-agent/spec.yaml

# 3) 本地校验并构建索引
node scripts/build-index.mjs

# 4) 发起 Pull Request
```

合并到 `main` 后，GitHub Actions 会自动发布最新 registry index。

---

## Registry

- **Index URL：** `https://openkursar.github.io/digital-human-protocol/index.json`
- **协议详情：** [`spec/registry-protocol.md`](../spec/registry-protocol.md)

客户端先读取 `index.json`，再按路径安装各数字人的 `spec.yaml`。

---

<div align="center">

### Build once, run anywhere — with DHP.

**协议规范：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)**

[回到顶部](#数字人协议-dhp)

</div>
