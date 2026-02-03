# 模态登录框迁移教程

将 Peter Cat 风格的登录模态框完整复刻到新 Rails 项目。

---

## 目录

1. [效果预览](#效果预览)
2. [文件清单](#文件清单)
3. [迁移步骤](#迁移步骤)
4. [完整代码](#完整代码)
5. [验证清单](#验证清单)
6. [常见问题](#常见问题)

---

## 效果预览

- **全屏模态框**：模糊背景遮罩，居中卡片
- **小猫动画**：输入邮箱时注视，输入密码时捂眼
- **浮动标签**：输入框获得焦点时标签上浮
- **登录/注册切换**：一键切换模式
- **优雅动画**：平滑的打开/关闭过渡效果

---

## 文件清单

需要复制或创建的 3 个核心文件：

| 文件 | 类型 | 用途 |
|------|------|------|
| `app/javascript/controllers/auth_modal_controller.js` | JavaScript | Stimulus 控制器，处理交互逻辑 |
| `app/views/shared/_auth_modal.html.erb` | ERB Partial | 模态框 HTML 结构和样式 |
| `app/assets/stylesheets/auth_modal.css` | CSS | 独立样式文件（可选） |

---

## 迁移步骤

### 步骤 1：复制 Stimulus 控制器

创建文件 `app/javascript/controllers/auth_modal_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = [
        "backdrop",
        "catWrapper",
        "titleText",
        "submitBtn",
        "toggleBtn"
    ]

    connect() {
        this.mode = "login"
        this.updateTexts()
    }

    // === Modal Visibility ===
    open(e) {
        console.log("打开模态登录页面")
        if (e) e.preventDefault()
        this.backdropTarget.classList.add("is-open")
    }

    close(e) {
        if (e) e.preventDefault()
        this.backdropTarget.classList.remove("is-open")
        this.blurInput() // Reset cat state
    }

    // === Mode Switching (Login <-> Join) ===
    toggleMode(e) {
        if (e) e.preventDefault()
        this.mode = this.mode === "login" ? "register" : "login"
        this.updateTexts()
    }

    updateTexts() {
        if (this.mode === "login") {
            this.titleTextTarget.textContent = "peter-cat"
            this.submitBtnTarget.textContent = "Enter"
            this.toggleBtnTarget.textContent = "Not a member? Join"
        } else {
            this.titleTextTarget.textContent = "join the club"
            this.submitBtnTarget.textContent = "Join"
            this.toggleBtnTarget.textContent = "Already a member? Enter"
        }
    }

    // === Cat Animation States ===

    focusEmail() {
        this.resetCat()
        this.catWrapperTarget.classList.add("cat-looking")
    }

    focusPassword() {
        this.resetCat()
        this.catWrapperTarget.classList.add("cat-covering")
    }

    blurInput() {
        this.resetCat()
    }

    resetCat() {
        this.catWrapperTarget.classList.remove("cat-looking", "cat-covering")
    }
}
```

**关键点说明：**
- `open()` / `close()`：通过添加/移除 `is-open` 类控制显示
- `focusEmail()` / `focusPassword()`：控制小猫动画状态
- `toggleMode()`：切换登录/注册模式，更新文本

---

### 步骤 2：创建模态框 Partial

创建文件 `app/views/shared/_auth_modal.html.erb`：

```erb
<style>
    /* 引入字体 */
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Montserrat:wght@300;400;600&display=swap');

    :root {
        --auth-bg: #FDFBF7;
        --auth-accent: #DC4C3E;
        --auth-text-main: #292524;
        --auth-text-sub: #a8a29e;
        --auth-border: #e7e5e4;
        --font-serif: "Cormorant Garamond", serif;
        --font-sans: "Montserrat", sans-serif;
    }

    /* === 遮罩层 === */
    .auth-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(28, 25, 23, 0.2);
        backdrop-filter: blur(2px);
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s;
    }

    .auth-backdrop.is-open {
        opacity: 1;
        visibility: visible;
    }

    /* === 模态卡片 === */
    .auth-card {
        background-color: var(--auth-bg);
        width: 100%;
        max-width: 380px;
        border-radius: 16px;
        border: 1px solid var(--auth-border);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        position: relative;
        transform: scale(0.95);
        transition: transform 0.3s ease-out;
    }

    .auth-backdrop.is-open .auth-card {
        transform: scale(1);
    }

    /* 关闭按钮 */
    .auth-close-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: var(--auth-text-sub);
        cursor: pointer;
        z-index: 10;
        transition: color 0.2s;
    }
    .auth-close-btn:hover {
        color: var(--auth-text-main);
    }

    /* === 小猫动画 === */
    .cat-wrapper {
        height: 160px;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        padding-top: 1.5rem;
        position: relative;
        overflow: hidden;
    }

    .cat-line {
        fill: none;
        stroke: var(--auth-accent);
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
    .cat-eye {
        fill: var(--auth-accent);
    }

    .cat-face-group { transition: transform 0.3s ease-out; }
    .cat-eyes-group { transition: transform 0.3s ease; }
    .cat-paws-group {
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s;
        transform-origin: center bottom;
        opacity: 0;
        transform: translateY(50px);
    }

    /* 小猫状态：看邮箱 */
    .cat-wrapper.cat-looking .cat-face-group { transform: translateY(4px); }
    .cat-wrapper.cat-looking .cat-eyes-group { transform: translate(-2px, 2px); }

    /* 小猫状态：捂眼睛 */
    .cat-wrapper.cat-covering .cat-paws-group {
        opacity: 1;
        transform: translateY(0);
    }
    .cat-wrapper.cat-covering .cat-face-group { transform: translateY(0); }

    /* === 标题 === */
    .auth-title {
        text-align: center;
        margin-bottom: 2rem;
        margin-top: -0.5rem;
    }
    .auth-title span {
        font-family: monospace;
        font-size: 0.75rem;
        color: var(--auth-accent);
        letter-spacing: 0.1em;
        text-transform: lowercase;
    }

    /* === 表单 === */
    .auth-form-body {
        padding: 0 2rem 2rem 2rem;
    }

    .input-group {
        position: relative;
        margin-bottom: 1.25rem;
    }

    .input-field {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--auth-border);
        padding: 0.5rem 0;
        font-family: var(--font-serif);
        font-size: 1rem;
        color: var(--auth-text-main);
        outline: none;
        transition: border-color 0.2s;
    }
    .input-field::placeholder { color: transparent; }
    .input-field:focus { border-color: var(--auth-accent); }

    .input-label {
        position: absolute;
        left: 0;
        font-family: var(--font-sans);
        pointer-events: none;
        transition: all 0.2s ease;
        top: -0.75rem;
        font-size: 0.75rem;
        color: var(--auth-text-sub);
        letter-spacing: 0.05em;
    }

    .input-field:focus + .input-label { color: var(--auth-accent); }
    .input-field:placeholder-shown:not(:focus) + .input-label {
        top: 0.5rem;
        font-size: 1rem;
        color: var(--auth-text-sub);
    }

    /* === 按钮 === */
    .auth-submit-btn {
        width: 100%;
        margin-top: 1.5rem;
        background-color: var(--auth-accent);
        color: white;
        padding: 0.75rem;
        border: none;
        border-radius: 6px;
        font-family: var(--font-sans);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
        box-shadow: 0 4px 6px rgba(220, 76, 62, 0.2);
    }
    .auth-submit-btn:hover { background-color: #c93f32; }
    .auth-submit-btn:active { transform: scale(0.98); }

    .auth-toggle-area {
        margin-top: 1rem;
        text-align: center;
    }
    .auth-toggle-link {
        background: none;
        border: none;
        font-size: 0.75rem;
        color: var(--auth-text-sub);
        text-decoration: underline;
        text-underline-offset: 4px;
        text-decoration-color: var(--auth-border);
        cursor: pointer;
        font-family: var(--font-sans);
        transition: color 0.2s;
    }
    .auth-toggle-link:hover { color: var(--auth-accent); }

    /* Join 触发按钮样式 */
    .nav-join-btn {
        position: fixed;
        top: 1.5rem;
        left: 1.5rem;
        font-family: var(--font-sans);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--auth-text-sub);
        background: none;
        border: none;
        cursor: pointer;
        z-index: 40;
        transition: color 0.2s;
    }
    .nav-join-btn:hover { color: var(--auth-accent); }
</style>

<%# Modal Backdrop %>
<div class="auth-backdrop" data-auth-modal-target="backdrop">

  <%# 点击遮罩关闭 %>
  <div style="position:absolute; inset:0;" data-action="click->auth-modal#close"></div>

  <%# Modal Card %>
  <div class="auth-card">

    <%# 关闭按钮 %>
    <button type="button" class="auth-close-btn" data-action="click->auth-modal#close">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>

    <%# 小猫动画 %>
    <div class="cat-wrapper" data-auth-modal-target="catWrapper">
      <svg width="160" height="120" viewBox="0 0 160 120" style="transform: translateY(8px);">
        <path d="M35,120 C35,100 30,50 50,35 C60,28 70,25 80,25 C90,25 100,28 110,35 C130,50 125,100 125,120" class="cat-line" />
        <path d="M54,36 L45,10 L75,28" class="cat-line" />
        <path d="M106,36 L115,10 L85,28" class="cat-line" />
        <path d="M125,100 C145,100 150,80 145,60 C140,40 125,50 120,60" class="cat-line" opacity="0.8" />

        <g class="cat-face-group">
          <g class="cat-eyes-group">
            <circle cx="65" cy="55" r="3" class="cat-eye" />
            <circle cx="95" cy="55" r="3" class="cat-eye" />
          </g>
          <path d="M80,65 L75,70 L85,70 Z" class="cat-eye" transform="scale(0.8) translate(16, 18)" />
          <path d="M80,72 L80,78" class="cat-line" stroke-width="2" />
        </g>

        <g class="cat-paws-group">
          <path d="M45,120 C45,90 55,50 65,55 C70,58 65,80 65,120" class="cat-line" fill="#FDFBF7" />
          <path d="M115,120 C115,90 105,50 95,55 C90,58 95,80 95,120" class="cat-line" fill="#FDFBF7" />
        </g>
      </svg>
    </div>

    <%# 标题 %>
    <div class="auth-title">
      <span data-auth-modal-target="titleText">peter-cat</span>
    </div>

    <%# 表单 %>
    <div class="auth-form-body">
      <form>
        <%# 邮箱 %>
        <div class="input-group">
          <input type="email" id="auth_email" class="input-field" placeholder="Email" required
                 data-action="focus->auth-modal#focusEmail blur->auth-modal#blurInput">
          <label for="auth_email" class="input-label">Email Address</label>
        </div>

        <%# 密码 %>
        <div class="input-group">
          <input type="password" id="auth_password" class="input-field" placeholder="Password" required
                 data-action="focus->auth-modal#focusPassword blur->auth-modal#blurInput">
          <label for="auth_password" class="input-label">Password</label>
        </div>

        <%# 提交按钮 %>
        <button type="submit" class="auth-submit-btn" data-auth-modal-target="submitBtn">
          Enter
        </button>
      </form>

      <%# 切换模式 %>
      <div class="auth-toggle-area">
        <button type="button" class="auth-toggle-link"
                data-action="click->auth-modal#toggleMode"
                data-auth-modal-target="toggleBtn">
          Not a member? Join
        </button>
      </div>
    </div>

  </div>
</div>
```

---

### 步骤 3：在页面中使用

编辑你想放置按钮的视图文件：

```erb
<%# 必须包裹在 data-controller="auth-modal" 中 %>
<div data-controller="auth-modal">

  <%# 触发按钮 %>
  <button type="button"
          class="nav-join-btn"
          data-action="click->auth-modal#open">
    Join
  </button>

  <%# 渲染模态框 %>
  <%= render "shared/auth_modal" %>

</div>
```

---

## 验证清单

部署后按顺序验证以下功能：

| # | 功能 | 操作 | 预期结果 |
|---|------|------|----------|
| 1 | 打开模态框 | 点击 Join 按钮 | 全屏遮罩出现，卡片居中显示 |
| 2 | 关闭动画 | 点击关闭按钮 | 模态框淡出消失 |
| 3 | 遮罩关闭 | 点击模态框外部 | 模态框关闭 |
| 4 | 小猫看邮箱 | 点击邮箱输入框 | 小猫眼睛向下移动 |
| 5 | 小猫捂眼 | 点击密码输入框 | 小猫爪子抬起遮住眼睛 |
| 6 | 输入恢复 | 点击空白处 | 小猫恢复默认状态 |
| 7 | 模式切换 | 点击 "Not a member? Join" | 标题变为 "join the club" |
| 8 | 模式切换回 | 点击 "Already a member? Enter" | 标题恢复 "peter-cat" |

---

## 常见问题

### Q1: 模态框不显示

**排查步骤：**
1. 浏览器控制台查看是否有 Stimulus 错误
2. 确认 `auth_modal_controller.js` 文件名和类名匹配
3. 确认 `data-controller="auth-modal"` 正确包裹按钮和 partial
4. 检查 `app/javascript/controllers/index.js` 是否正确配置

### Q2: 小猫动画不生效

**检查点：**
- `data-auth-modal-target="catWrapper"` 是否在 `.cat-wrapper` 元素上
- 输入框的 `data-action` 是否绑定正确：
  ```erb
  data-action="focus->auth-modal#focusEmail blur->auth-modal#blurInput"
  ```

### Q3: 样式错乱

**可能原因：**
- CSS 变量未定义：确认 `:root` 中的颜色变量
- 字体未加载：需要网络连接加载 Google Fonts
- z-index 冲突：`.auth-backdrop` 的 `z-index: 50` 可能被覆盖

### Q4: 如何修改按钮位置

编辑 `.nav-join-btn` 的 CSS：
```css
.nav-join-btn {
  position: fixed;
  top: 1.5rem;      /* 改为需要的值 */
  left: 1.5rem;     /* 改为需要的值 */
  /* ... */
}
```

---

## 进阶定制

### 修改品牌颜色

在 `:root` 中修改主色调：
```css
:root {
  --auth-accent: #DC4C3E;  /* 改为你的品牌色 */
}
```

### 添加表单提交逻辑

在 `auth_modal_controller.js` 中添加：
```javascript
submit(e) {
  e.preventDefault()
  const email = this.element.querySelector('#auth_email').value
  const password = this.element.querySelector('#auth_password').value
  // 你的提交逻辑
}
```

---

## 总结

通过以上 3 个文件的复制和简单的页面配置，即可在新项目中完整复刻 Peter Cat 风格的登录模态框。

**核心依赖：**
- Rails 7 + Hotwire/Stimulus
- 无需额外 JavaScript 库
- 纯 CSS 动画，性能优异
