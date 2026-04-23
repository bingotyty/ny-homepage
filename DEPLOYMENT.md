# ny-homepage 部署运维手册

> 最后更新：2026-04-23
> 适用项目：ニューヨーク合同会社 (NEW YORK LLC) 公式ホームページ
> 仓库：https://github.com/bingotyty/ny-homepage

---

## 1. 项目背景

### 1.1 业务背景

ニューヨーク合同会社（NEW YORK LLC）是 2020 年 6 月由代表 **夏 智子** 女士在东京银座成立的 AI 科技公司。主营业务是基于自研 AI 引擎的 **オンライン広告コンプライアンス監視・検閲ソリューション**（在线广告合规监控 SaaS），为广告主、代理商提供薬機法/景品表示法/特定商取引法等法规适配性的实时自动判定。

本仓库是该公司的官方企业主页。

### 1.2 设计方向

- **视觉语言**：TikTok 招牌配色 + 日式「爽やか・すっきり・かわいい」
- **当前主题（cream-theme 分支）**：乳白底色 `#fff6ec` + 青粉渐变（`#1bc5d0` → `#a68cff` → `#ff4081`）+ 圆润字体（M PLUS Rounded 1c / Fredoka / Zen Maru Gothic）
- **视觉效果**：Hero 标题 RGB 偏移 glitch、滚动 reveal、Tech 卡 3D Tilt、鼠标光晕

### 1.3 技术选型

- **纯静态前端**：HTML + CSS + JS（无打包构建，无框架），保证部署简单、加载快
- **Express 静态服务器**：7 行代码托管 `public/`，零配置，便于 systemd 管理
- **Cloudflare Tunnel**：避免在服务器上开放公网端口 / 装 Nginx / 处理 TLS，所有证书由 Cloudflare 托管
- **Cloudflare for SaaS**：让客户自有域名（`www.nyc-ads.com` 等）跨账号接入，不触发跨账号 CNAME 封禁

---

## 2. 代码结构

```
ny-homepage/
├── public/
│   ├── index.html       # 入口页（6 sections: Hero/Service/Technology/Market/Contact/Company）
│   ├── styles.css       # 所有样式 + 动画
│   └── script.js        # 滚动 reveal、计数动画、3D Tilt、鼠标光晕
├── server.js            # Express 静态服务（默认端口 6644）
├── package.json
├── .gitignore
├── README.md
└── DEPLOYMENT.md        # ← 本文件
```

**关键设计决策**

| 项 | 决策 | 理由 |
|----|------|------|
| 字体 | Google Fonts CDN | 免本地资产，无版权问题 |
| CSS | 单一 `styles.css` | 中小项目不值得拆分，改一处改完 |
| 端口 | `6644` | 避免与 ad-homepage (`6633`)、llm-japan-site (`6688`) 冲突 |
| Branch | `cream-theme` | 当前 production branch，不是 `main` |

---

## 3. 本地开发

### 3.1 依赖

仅需 `express`。`node_modules` 通过**符号链接**共享 ad-homepage 的：

```bash
cd "/home/ubuntu/happyclaw-workspace/happyclaw/data/groups/main/code&repo/ny-homepage"
ls -la node_modules   # -> ../ad-homepage/node_modules
```

如果要独立安装：

```bash
rm node_modules
npm install
```

### 3.2 启动

```bash
npm start
# 或
PORT=6644 node server.js
```

访问 http://127.0.0.1:6644/

### 3.3 改代码流程

```bash
# 改完文件后
git add public/
git commit -m "调整: 描述一下改了啥"
git push origin cream-theme

# 触发生产环境重启（systemd 会 0 downtime 重建进程）
sudo systemctl restart ny-homepage
```

---

## 4. 生产部署架构

### 4.1 请求链路

```
                用户浏览器
                    │ HTTPS
                    ▼
       ┌────────────────────────────────────┐
       │   Cloudflare Edge (全球节点)        │
       │                                    │
       │  情况 A:                            │
       │  ny-dearchao.withllm.com            │
       │    ↓ CNAME                          │
       │  xxx.cfargotunnel.com (同账号)       │
       │                                    │
       │  情况 B:                            │
       │  www.nyc-ads.com (客户账号)          │
       │    ↓ Cloudflare for SaaS            │
       │    ↓ Custom origin: ny-dearchao...  │
       │                                    │
       └───────────────────┬────────────────┘
                           │ QUIC over UDP:443
                           ▼
       ┌────────────────────────────────────┐
       │   EC2 (ip-172-26-7-194)             │
       │                                    │
       │  cloudflared-llm-japan-hp.service   │
       │    └ ingress match by Host header   │
       │                                    │
       │  ny-homepage.service                │
       │    └ node server.js → :6644         │
       └────────────────────────────────────┘
```

### 4.2 组件清单

| 组件 | 位置 / 身份 |
|------|-------------|
| **Node 服务** | `ny-homepage.service` → `/usr/bin/node server.js`，监听 `127.0.0.1:6644` |
| **Tunnel daemon** | `cloudflared-llm-japan-hp.service` 运行 tunnel **`llm-japan-hp`**（UUID `b7b5c8a1-fe80-4f8d-b54c-343ce47faa27`） |
| **Tunnel 配置** | `/home/ubuntu/.openclaw/workspace/projects/llm-japan-site/cloudflared/config.yml` |
| **Tunnel 凭证** | `/home/ubuntu/.cloudflared/b7b5c8a1-fe80-4f8d-b54c-343ce47faa27.json` |
| **Cloudflare Zone** | `withllm.com`（zone ID `251a8fb5e94179cba69822a046d8329a`） |
| **Cloudflare Account** | `1fe827247e666604b7403f26f35ebf9a` (Bingoforjob@gmail.com) |
| **公网域名** | `ny-dearchao.withllm.com`（我方域名）<br>`www.nyc-ads.com`（客户域名，SaaS 接入） |

---

## 5. systemd Service 详解

### 5.1 ny-homepage.service

**文件位置**：`/etc/systemd/system/ny-homepage.service`

```ini
[Unit]
Description=NY LLC Homepage (localhost:6644)
After=network-online.target
Wants=network-online.target
Before=cloudflared-llm-japan-hp.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/happyclaw-workspace/happyclaw/data/groups/main/code&repo/ny-homepage
Environment=PORT=6644
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
# Basic hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false
ReadWritePaths=/home/ubuntu/happyclaw-workspace/happyclaw/data/groups/main/code&repo/ny-homepage

[Install]
WantedBy=multi-user.target
```

**关键点**

- `Before=cloudflared-llm-japan-hp.service` — 确保 Node 服务比 tunnel 先启动，避免 tunnel 启动时打 6644 连接被拒
- `Restart=always` + `RestartSec=3` — 进程崩溃 3 秒内自动拉起
- `PrivateTmp=true` / `ProtectSystem=full` — 基本安全加固
- `ReadWritePaths=...` — `ProtectSystem=full` 默认只读 `/usr` `/boot` `/etc`，对 `/home` 不影响，这里显式声明可写路径更保险

### 5.2 cloudflared-llm-japan-hp.service（已存在，不归本项目独享）

该 service 同时承载 `hp.withllm.com` / `hp.llmjp.com` / `bingoclaw.withllm.com` / `ny-dearchao.withllm.com` / `www.nyc-ads.com` 等多个 hostname，因此**不要随便删 ingress，改之前先确认**。

```ini
[Unit]
Description=cloudflared tunnel (hp.withllm.com -> localhost:6688)
After=network-online.target llm-japan-site.service
Wants=network-online.target llm-japan-site.service

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/ubuntu/.openclaw/workspace/projects/llm-japan-site/cloudflared/config.yml run llm-japan-hp
Restart=always
RestartSec=2
```

---

## 6. Cloudflare Tunnel 配置

### 6.1 config.yml

`/home/ubuntu/.openclaw/workspace/projects/llm-japan-site/cloudflared/config.yml`：

```yaml
tunnel: llm-japan-hp
credentials-file: /home/ubuntu/.cloudflared/b7b5c8a1-fe80-4f8d-b54c-343ce47faa27.json

ingress:
  - hostname: hp.withllm.com
    service: http://localhost:6688

  - hostname: hp.llmjp.com
    service: http://localhost:6688

  # OpenClaw Dashboard (Control UI)
  - hostname: bingoclaw.withllm.com
    service: http://localhost:18789

  # NY LLC Homepage
  - hostname: ny-dearchao.withllm.com
    service: http://localhost:6644

  # Customer custom hostname (Cloudflare for SaaS)
  - hostname: www.nyc-ads.com
    service: http://localhost:6644

  - service: http_status:404
```

**关键规则**

- ingress 按顺序匹配 `Host` header，第一条命中即返回
- **最后一条 `http_status:404` 是兜底**，必须保留
- 每次修改后需要 `sudo systemctl restart cloudflared-llm-japan-hp.service`（cloudflared **不响应 SIGHUP**，必须完整重启）

### 6.2 修改 / 添加新 hostname 的完整流程

1. 编辑 config.yml，添加 ingress rule
2. 校验：
   ```bash
   /usr/local/bin/cloudflared \
     --config /home/ubuntu/.openclaw/workspace/projects/llm-japan-site/cloudflared/config.yml \
     tunnel ingress validate
   ```
   正确时返回 `OK`
3. 添加 DNS 记录（如果是 withllm.com 下的子域）：
   ```bash
   /usr/local/bin/cloudflared tunnel route dns llm-japan-hp <hostname>
   ```
   自动创建 CNAME `<hostname>` → `<tunnel-uuid>.cfargotunnel.com`
4. 重启 tunnel：
   ```bash
   sudo systemctl restart cloudflared-llm-japan-hp.service
   ```

---

## 7. Cloudflare for SaaS · Custom Hostnames

### 7.1 为什么要用（Error 1014 始末）

**场景**：客户 `nyc-ads.com` / `summer-shokai.net` 等域名托管在他们自己的 Cloudflare 账号，需要把它们指向我们的 tunnel 服务。

**最初的尝试**（错误）：直接让客户 CNAME
```
www.nyc-ads.com → ny-dearchao.withllm.com → cfargotunnel.com (我方 tunnel)
```

**结果**：Cloudflare 返回
```
Error 1014 · CNAME Cross-User Banned
```

**原因**：Cloudflare 禁止跨账号的 CNAME 最终代理到另一账号的 Tunnel，防止跨账号盗用 tunnel 流量或 SSL 证书。

**正确方案**：Cloudflare for SaaS Custom Hostnames
- 在我方账号下的 zone `withllm.com` 里把客户域名登记为 Custom Hostname
- Cloudflare 验证所有权（TXT record）后签发独立证书
- 客户域名的流量被 Cloudflare SaaS 合法路由到我方 origin

### 7.2 接入新客户域名的操作步骤

#### Step 1. Cloudflare Dashboard 侧（我方）

路径：Cloudflare Dashboard → **withllm.com** zone → **SSL/TLS** → **Custom Hostnames**

1. **Fallback Origin**：设置为一个任意的已工作的 tunnel hostname，例如 `ny-dearchao.withllm.com`（必须先建好，只用作兜底）
2. **Add Custom Hostname**：
   - Hostname: `www.nyc-ads.com`（注意区分 apex vs www！）
   - Certificate type: **Provided by Cloudflare** (Let's Encrypt)
   - Certificate validation method: **TXT Validation**（推荐，不依赖 origin 在线）
   - Minimum TLS version: **TLS 1.2**（建议）
   - Custom origin server: **指定**对应的 tunnel hostname
     - `www.nyc-ads.com` → `ny-dearchao.withllm.com` (tunnel: llm-japan-hp, port 6644)
     - `www.summer-shokai.net` → `ad-dearchao.withllm.com` (tunnel: ad-withllm, port 6633)
   - Save

3. **展开 hostname 详情**，复制 Cloudflare 生成的验证记录。一般会给出：
   - `_cf-custom-hostname.<hostname>` TXT — 所有权验证
   - `_acme-challenge.<hostname>` TXT — 证书 DCV

#### Step 2. Tunnel ingress 侧（⚠️ 容易漏）

因为 Cloudflare for SaaS **默认保留原 Host header 转发到 origin**，所以 tunnel 看到的是客户域名而不是 origin 域名。必须在 tunnel config.yml 里加对应 ingress rule，否则 tunnel 会命中兜底 `http_status:404`。

```yaml
  # Customer custom hostname (Cloudflare for SaaS)
  - hostname: www.nyc-ads.com
    service: http://localhost:6644
```

然后重启 tunnel service。**过去曾在此环节翻车过一次，报 HTTP 404 error（2026-04-21）**。

#### Step 3. 客户侧

把以下信息发给客户，由客户在自己域名的 DNS 里添加：

```
# 1. 域名指向（必需）
CNAME  www  →  ny-dearchao.withllm.com        ; Proxied 开关都可以

# 2. 所有权验证 TXT（必需）
TXT    _cf-custom-hostname.www.nyc-ads.com    ;  DNS only
       值：<Dashboard 给的 UUID>

# 3. 证书 DCV TXT（必需，validate 方式 = TXT 时）
TXT    _acme-challenge.www.nyc-ads.com        ;  DNS only
       值：<Dashboard 给的字符串>
```

Cloudflare 会定期轮询这些 TXT 验证，通过后 Certificate 状态会从 `Pending Validation` 变成 `Active`。一般 1-30 分钟。

### 7.3 当前生效的 Custom Hostnames

| Custom Hostname | 客户 | 对应 tunnel hostname | 后端 |
|-----------------|------|---------------------|------|
| `www.nyc-ads.com` | NYC Ads | `ny-dearchao.withllm.com` | ny-homepage (:6644) |
| `www.summer-shokai.net` | Summer 商会 | `ad-dearchao.withllm.com` | ad-homepage (:6633) |

### 7.4 Fallback Origin 只有一个，多后端怎么办？

Custom Hostnames 的 **Fallback Origin** 全 zone 共享一个。要让不同 hostname 路由到不同后端，**必须在每个 Custom Hostname 的 Edit 页面单独填 "Custom origin server"**，覆盖 fallback。

---

## 8. 常用运维命令

### 8.1 服务管理

```bash
# 状态
sudo systemctl status ny-homepage
sudo systemctl status cloudflared-llm-japan-hp

# 重启（改代码后）
sudo systemctl restart ny-homepage

# 重启 tunnel（改 config.yml 后）
sudo systemctl restart cloudflared-llm-japan-hp

# 实时日志
sudo journalctl -u ny-homepage -f
sudo journalctl -u cloudflared-llm-japan-hp -f
```

### 8.2 Tunnel 信息

```bash
# 看所有 tunnel
/usr/local/bin/cloudflared tunnel list

# 看某 tunnel 的 connector 状态
/usr/local/bin/cloudflared tunnel info llm-japan-hp

# 校验 ingress 配置
/usr/local/bin/cloudflared \
  --config /home/ubuntu/.openclaw/workspace/projects/llm-japan-site/cloudflared/config.yml \
  tunnel ingress validate
```

### 8.3 访问测试

```bash
# 本地后端
curl -I http://127.0.0.1:6644/

# 内网域名（直接 tunnel）
curl -I https://ny-dearchao.withllm.com/

# 客户域名（SaaS 路径）
curl -I https://www.nyc-ads.com/

# 看 ingress 是否匹配对（通过 Host header 伪造）
# ⚠️ 从外网 curl 会被 Cloudflare 防伪造拦住；仅用于在 tunnel 本机调试
```

---

## 9. 故障排查

### 9.1 HTTP 404 "page can't be found"

**现象**：浏览器打开 `https://www.nyc-ads.com/` 显示 404（不是 Cloudflare 样式的 404，是 nginx/ingress 格式）。

**原因**：tunnel ingress 里没有 `www.nyc-ads.com` 的规则，命中了兜底 `http_status:404`。

**修复**：按 [§7.2 Step 2](#step-2-tunnel-ingress-侧-容易漏) 在 config.yml 添加规则 → `systemctl restart cloudflared-llm-japan-hp`。

### 9.2 Error 1014 · CNAME Cross-User Banned

**现象**：访问返回 Cloudflare 1014 错误页。

**原因**：客户直接 CNAME 到 `*.cfargotunnel.com` 或跨账号 CNAME 到 tunnel hostname。

**修复**：走 Cloudflare for SaaS Custom Hostname 流程（§7），不要直接 CNAME。

### 9.3 "Just a moment..." 一直卡住

**现象**：Cloudflare JS Challenge 页转圈不进。

**原因**：`withllm.com` zone 的 Bot Fight Mode / Security Level 过严。

**修复**：Cloudflare Dashboard → **withllm.com** → Security → Bots → **Bot Fight Mode** 关掉，或 Security Level 改 Low / Essentially Off，或加 WAF skip rule。

### 9.4 Certificate 一直 `Pending Validation (TXT)`

**原因**：客户没加 `_acme-challenge.<hostname>` TXT，或 TXT 值错，或 proxied 开了导致 TXT 不解析（TXT 记录必须是 DNS only）。

**排查**：
```bash
dig +short TXT _acme-challenge.www.nyc-ads.com @1.1.1.1
dig +short TXT _cf-custom-hostname.www.nyc-ads.com @1.1.1.1
```
如果返回空，联系客户重加。

### 9.5 服务重启后公网访问不通

按这个顺序排查：

1. **Node 服务**：`systemctl status ny-homepage` / `curl http://127.0.0.1:6644/`
2. **Tunnel daemon**：`systemctl status cloudflared-llm-japan-hp` / `cloudflared tunnel info llm-japan-hp` 有 4 个 QUIC connection 才算健康
3. **DNS 解析**：`dig +short ny-dearchao.withllm.com @1.1.1.1` 应返回 Cloudflare IP (104.21.x.x / 172.67.x.x)
4. **Cloudflare Edge**：`curl -I https://ny-dearchao.withllm.com/` 应 HTTP 200

---

## 10. 变更历史

| 日期 | 操作 | 备注 |
|------|------|------|
| 2026-04-20 | 项目初始化 | 深色 TikTok 主题，放在 `/code&repo/ny-homepage/` |
| 2026-04-21 | 推送到 GitHub | `bingotyty/ny-homepage`，main 分支 |
| 2026-04-21 | 创建 `cream-theme` 分支 | 乳白底 + 青粉渐变 + 圆润字体 |
| 2026-04-21 | 删除冗余装饰 | kawaii stickers、Vision section、Banks 卡、emoji、Hero badge |
| 2026-04-21 | 重组信息架构 | About 移到最后；Contact 卡片 2 列 |
| 2026-04-21 | 移除标题末尾句点【。】 | 5 处 h2 |
| 2026-04-21 | Tunnel hostname 多次切换 | `ny.withllm.com` → `ny-xiachao.withllm.com` → `ny-dearchao.withllm.com` |
| 2026-04-21 | 清理旧 DNS 记录 | 通过 Cloudflare API 删除 `ny.*` / `ny-xiachao.*` |
| 2026-04-21 | 接入客户域名（SaaS） | `www.nyc-ads.com` · `www.summer-shokai.net` |
| 2026-04-21 | 纳入 systemd 托管 | `ny-homepage.service` + auto-restart |
| 2026-04-23 | 补写部署文档 | 本文件 |

---

## 11. 待办 / 技术债

- [ ] `ad-homepage` (`:6633`) 和 `ad-withllm` tunnel 仍是 **nohup 手动启动**，未纳入 systemd → 服务器重启会丢
- [ ] 旧 DNS `ny.withllm.com` / `ny-xiachao.withllm.com` 已删除，但如果以后搜到，**不要恢复**
- [ ] Cloudflare Bot Challenge 当前默认开启 — 客户从手机/海外 IP 访问有几秒 "Just a moment..." 体验不理想，可考虑关闭或做 hostname 级 skip rule
- [ ] 当前部署走 `cream-theme` 分支，`main` 分支还是旧深色版。如果未来要合并，做 `git merge cream-theme` 或将 default branch 改为 `cream-theme`

---

## 12. 紧急联系

- **域名注册 / Cloudflare 账号主**：Bingoforjob@gmail.com
- **服务器**：AWS EC2 `ip-172-26-7-194` (172.26.7.194)
- **代码托管**：GitHub `bingotyty/ny-homepage`
- **生产 URL**：
  - https://ny-dearchao.withllm.com/ （内部）
  - https://www.nyc-ads.com/ （对客户）
