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
- **AJAX 提交**：无刷新登录，成功后动态更新导航栏

---

## 文件清单

需要复制或创建的 4 个核心文件：

| 文件 | 类型 | 用途 |
|------|------|------|
| `app/javascript/controllers/auth_modal_controller.js` | JavaScript | Stimulus 控制器，处理交互逻辑和表单提交 |
| `app/views/shared/_auth_modal.html.erb` | ERB Partial | 模态框 HTML 结构和样式 |
| `app/assets/stylesheets/auth_modal.css` | CSS | 独立样式文件（推荐） |
| `app/controllers/sessions_controller.rb` | Ruby | 后端控制器，支持 AJAX 响应 |

---

## 迁移步骤

### 步骤 1：复制 Stimulus 控制器

创建文件 `app/javascript/controllers/auth_modal_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

/**
 * AuthModalController - 认证模态框控制器
 *
 * 功能说明：
 * 本控制器管理登录/注册模态框的行为，包括：
 * 1. 模态框的打开和关闭动画
 * 2. 登录/注册模式切换
 * 3. 表单提交（支持两种模式的不同端点）
 * 4. 小猫SVG动画交互（根据输入框焦点变化）
 * 5. 错误消息显示
 */
export default class extends Controller {
    /**
     * 定义控制器中使用的目标元素
     * 这些元素可以通过 this.xxxTarget 访问
     */
    static targets = [
        "backdrop",            // 模态框遮罩层
        "catWrapper",          // 小猫动画容器
        "titleText",           // 模态框标题
        "submitBtn",           // 提交按钮
        "toggleBtn",           // 切换登录/注册模式的链接
        "errorMessage",        // 错误消息容器
        "errorText",           // 错误消息文本
        "form",                // 表单元素
        "emailField",          // 邮箱输入框
        "passwordField",       // 密码输入框
        "passwordConfirmGroup" // 密码确认输入框组（仅注册模式显示）
    ]

    /**
     * 控制器初始化
     * 当控制器连接到DOM时自动调用
     */
    connect() {
        // 初始化当前模式为登录
        this.mode = "login"
        // 设置表单提交的目标URL
        this.loginUrl = "/login"
        this.registerUrl = "/signup"
        // 更新界面文本
        this.updateTexts()
        // 初始化表单字段（确保name属性正确）
        this.updateFormFields()
        console.log("[AuthModal] 控制器已初始化，模式:", this.mode)
    }

    /**
     * 打开模态框
     * @param {Event} e - 点击事件（可选）
     *
     * 给遮罩层添加 is-open 类，触发CSS过渡动画显示模态框
     */
    open(e) {
        console.log("open auth modal view")
        if (e) e.preventDefault()
        // 确保是登录模式（默认）
        if (this.mode !== "login") {
            this.mode = "login"
            this.updateTexts()
            this.updateFormFields()
        }
        this.backdropTarget.classList.add("is-open")
        document.body.style.overflow = "hidden" // 禁止背景滚动
    }

    /**
     * 关闭模态框
     * @param {Event} e - 点击事件（可选）
     *
     * 移除 is-open 类隐藏模态框，并重置小猫动画状态
     */
    close(e) {
        if (e) e.preventDefault()
        this.backdropTarget.classList.remove("is-open")
        document.body.style.overflow = "" // 恢复背景滚动
        this.blurInput() // Reset cat state
    }

    /**
     * 切换登录/注册模式
     * @param {Event} e - 点击事件（可选）
     *
     * 在登录和注册模式之间切换，更新界面文本和表单字段
     */
    toggleMode(e) {
        if (e) e.preventDefault()
        // 切换模式
        this.mode = this.mode === "login" ? "register" : "login"
        // 更新界面显示
        this.updateTexts()
        // 更新表单字段显示
        this.updateFormFields()
        // 隐藏之前的错误消息
        this.hideError()
    }

    /**
     * 更新界面文本
     * 根据当前模式（login/register）更新标题、按钮和链接文本
     */
    updateTexts() {
        if (this.mode === "login") {
            this.titleTextTarget.textContent = "peter-cat"
            this.submitBtnTarget.value = "Enter"
            this.toggleBtnTarget.textContent = "Not a member? Join"
        } else {
            this.titleTextTarget.textContent = "join the club"
            this.submitBtnTarget.value = "Join"
            this.toggleBtnTarget.textContent = "Already a member? Enter"
        }
    }

    /**
     * 更新表单字段显示
     * 根据当前模式显示/隐藏密码确认字段，并更新表单action
     */
    updateFormFields() {
        console.log("[AuthModal] 更新表单字段，当前模式:", this.mode)

        // 控制密码确认字段的显示/隐藏 - 使用 CSS 类保持布局稳定
        if (this.hasPasswordConfirmGroupTarget) {
            if (this.mode === "register") {
                this.passwordConfirmGroupTarget.classList.add("is-visible")
                // 添加required属性
                const confirmInput = this.passwordConfirmGroupTarget.querySelector('input')
                if (confirmInput) confirmInput.required = true
            } else {
                this.passwordConfirmGroupTarget.classList.remove("is-visible")
                // 移除required属性
                const confirmInput = this.passwordConfirmGroupTarget.querySelector('input')
                if (confirmInput) confirmInput.required = false
            }
        }

        // 更新表单action URL
        if (this.hasFormTarget) {
            const newAction = this.mode === "login" ? this.loginUrl : this.registerUrl
            this.formTarget.action = newAction
            console.log("[AuthModal] 表单action已更新为:", newAction)
        }

        // 更新表单字段的name属性以匹配后端期望的参数格式
        // 登录使用 session[email], session[password]
        // 注册使用 user[email], user[password]
        const prefix = this.mode === "login" ? "session" : "user"
        console.log("[AuthModal] 使用参数前缀:", prefix)

        if (this.hasEmailFieldTarget) {
            this.emailFieldTarget.name = `${prefix}[email]`
            console.log("[AuthModal] email字段name已更新为:", this.emailFieldTarget.name)
        }

        if (this.hasPasswordFieldTarget) {
            this.passwordFieldTarget.name = `${prefix}[password]`
            console.log("[AuthModal] password字段name已更新为:", this.passwordFieldTarget.name)
        }
    }

    // === Cat Animation States ===

    /**
     * 邮箱输入框获得焦点时
     * 小猫看向邮箱输入框（添加CSS类触发动画）
     */
    focusEmail() {
        this.resetCat()
        // 添加CSS类移动小猫眼睛
        this.catWrapperTarget.classList.add("cat-looking")
    }

    /**
     * 密码输入框获得焦点时
     * 小猫捂住眼睛（表示隐私保护）
     */
    focusPassword() {
        this.resetCat()
        // 添加CSS类举起小猫爪子
        this.catWrapperTarget.classList.add("cat-covering")
    }

    /**
     * 输入框失去焦点时
     * 重置小猫动画状态
     */
    blurInput() {
        this.resetCat()
    }

    /**
     * 重置小猫动画
     * 移除所有动画相关的CSS类
     */
    resetCat() {
        this.catWrapperTarget.classList.remove("cat-looking", "cat-covering")
    }

    /**
     * 处理表单提交
     * @param {Event} event - 表单提交事件
     *
     * 根据当前模式（login/register）提交到不同的后端端点
     * 支持Turbo Stream响应以实现无刷新页面更新
     */
    async submitForm(event) {
        event.preventDefault()
        const form = event.target

        // 隐藏之前的错误消息
        this.hideError()

        // 强制更新表单字段名称，确保与当前模式匹配
        this.updateFormFields()

        // 获取表单数据
        const formData = new FormData(form)

        // 根据当前模式确定提交URL
        const submitUrl = this.mode === "login" ? this.loginUrl : this.registerUrl
        console.log("[AuthModal] 提交URL:", submitUrl)

        // 获取CSRF token（Rails使用它来防止跨站请求伪造攻击）
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

        try {
            // 发送AJAX请求
            const response = await fetch(submitUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'same-origin'
            })

            if (response.ok) {
                await this.handleSuccessResponse(response)
            } else {
                await this.handleErrorResponse(response)
            }
        } catch (error) {
            console.error(`${this.mode === "login" ? '登录' : '注册'}请求失败:`, error)
            this.showError('网络错误，请重试')
        }
    }

    /**
     * 处理成功响应
     * 登录/注册成功后关闭模态框并更新页面
     */
    async handleSuccessResponse(response) {
        const data = await response.json()
        console.log('[AuthModal] 成功响应:', data)

        // 关闭模态框
        this.close()

        // 显示成功提示
        this.showToast(data.message || (this.mode === "login" ? '登录成功！' : '欢迎加入！'))

        // 使用后端返回的HTML更新导航栏（无刷新）
        if (data.nav_bar_html) {
            this.updateNavBar(data.nav_bar_html)
        }

        // 触发登录成功事件（供其他组件监听）
        this.dispatchLoginSuccessEvent(data.user)
    }

    /**
     * 处理错误响应
     * 解析并显示错误消息
     */
    async handleErrorResponse(response) {
        const data = await response.json()
        console.log('[AuthModal] 错误响应:', data)
        this.showError(data.error || (this.mode === "login" ? '邮箱或密码错误' : '注册失败'))
    }

    /**
     * 更新导航栏
     * @param {string} html - 导航栏HTML内容
     *
     * 直接替换导航栏DOM，不刷新整个页面
     */
    updateNavBar(html) {
        const navBar = document.getElementById('nav-bar')
        if (navBar) {
            navBar.outerHTML = html
            console.log('[AuthModal] 导航栏已更新')
        }
    }

    /**
     * 派发登录成功事件
     * 供其他组件（如收藏功能）监听登录成功
     */
    dispatchLoginSuccessEvent(user) {
        const event = new CustomEvent('auth:login:success', {
            detail: { user },
            bubbles: true
        })
        document.dispatchEvent(event)
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        if (this.hasErrorMessageTarget && this.hasErrorTextTarget) {
            this.errorTextTarget.textContent = message
            this.errorMessageTarget.style.display = 'block'
        }
    }

    /**
     * 隐藏错误消息
     */
    hideError() {
        if (this.hasErrorMessageTarget) {
            this.errorMessageTarget.style.display = 'none'
        }
    }

    /**
     * 显示Toast提示
     * 在屏幕中央显示一个自动消失的提示框
     */
    showToast(message) {
        const toast = document.createElement('div')
        toast.textContent = message
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-size: 0.875rem;
            z-index: 9999;
            animation: fadeInOut 2s ease forwards;
        `

        const style = document.createElement('style')
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
        `
        document.head.appendChild(style)
        document.body.appendChild(toast)

        setTimeout(() => {
            toast.remove()
            style.remove()
        }, 2000)
    }
}
```

**关键点说明：**
- `open()` / `close()`：通过添加/移除 `is-open` 类控制显示，同时控制背景滚动
- `focusEmail()` / `focusPassword()`：控制小猫动画状态
- `toggleMode()`：切换登录/注册模式，动态更新表单字段和提交目标
- `submitForm()`：AJAX 提交表单，支持 JSON 响应

---

### 步骤 2：创建模态框 Partial

创建文件 `app/views/shared/_auth_modal.html.erb`：

```erb
<%#
  Auth Modal Partial
  ==================
  需要在 data-controller="auth-modal" 的父元素内使用

  使用方法：
  <div data-controller="auth-modal">
    <button data-action="click->auth-modal#open">Join</button>
    <%= render "shared/auth_modal" %>
  </div>
%>

<%# 1. Modal Backdrop - 全屏遮罩层 %>
<div class="auth-backdrop" data-auth-modal-target="backdrop">

  <%# 点击遮罩层关闭模态框 %>
  <div class="auth-backdrop-overlay" data-action="click->auth-modal#close"></div>

  <%# 2. Modal Card - 居中卡片 %>
  <div class="auth-card">

    <%# 关闭按钮 %>
    <button type="button" class="auth-close-btn" data-action="click->auth-modal#close" aria-label="关闭">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>

    <%# 3. Cat Animation Header - 小猫动画 %>
    <div class="cat-wrapper" data-auth-modal-target="catWrapper">
      <svg width="160" height="120" viewBox="0 0 160 120" style="transform: translateY(8px);" aria-hidden="true">
        <%# 身体轮廓 %>
        <path d="M35,120 C35,100 30,50 50,35 C60,28 70,25 80,25 C90,25 100,28 110,35 C130,50 125,100 125,120" class="cat-line" />
        <%# 左耳 %>
        <path d="M54,36 L45,10 L75,28" class="cat-line" />
        <%# 右耳 %>
        <path d="M106,36 L115,10 L85,28" class="cat-line" />
        <%# 尾巴 %>
        <path d="M125,100 C145,100 150,80 145,60 C140,40 125,50 120,60" class="cat-line" opacity="0.8" />

        <%# 脸部组（可动画）%>
        <g class="cat-face-group">
          <g class="cat-eyes-group">
            <circle cx="65" cy="55" r="3" class="cat-eye" />
            <circle cx="95" cy="55" r="3" class="cat-eye" />
          </g>
          <path d="M80,65 L75,70 L85,70 Z" class="cat-eye" transform="scale(0.8) translate(16, 18)" />
          <path d="M80,72 L80,78" class="cat-line" stroke-width="2" />
        </g>

        <%# 爪子组（可动画）%>
        <g class="cat-paws-group">
          <path d="M45,120 C45,90 55,50 65,55 C70,58 65,80 65,120" class="cat-line" fill="#FDFBF7" />
          <path d="M115,120 C115,90 105,50 95,55 C90,58 95,80 95,120" class="cat-line" fill="#FDFBF7" />
        </g>
      </svg>
    </div>

    <%# 4. Title - 标题 %>
    <div class="auth-title">
      <span data-auth-modal-target="titleText">peter-cat</span>
    </div>

    <%# 5. Form Section - 表单区域 %>
    <div class="auth-form-body">

      <%# 错误消息显示区域（默认隐藏）%>
      <div class="auth-error" data-auth-modal-target="errorMessage" style="display: none;">
        <span data-auth-modal-target="errorText"></span>
      </div>

      <%# 登录/注册表单 %>
      <%= form_with url: login_path, method: :post, class: "auth-form",
            data: {
              turbo: false,
              action: "submit->auth-modal#submitForm",
              auth_modal_target: "form"
            } do |f| %>

        <%# Email 输入框 %>
        <div class="input-group">
          <%= f.email_field :email,
                class: "input-field",
                placeholder: "Email",
                required: true,
                name: "session[email]",
                data: {
                  action: "focus->auth-modal#focusEmail blur->auth-modal#blurInput",
                  auth_modal_target: "emailField"
                } %>
          <%= f.label :email, "Email Address", class: "input-label" %>
        </div>

        <%# Password 输入框 %>
        <div class="input-group">
          <%= f.password_field :password,
                class: "input-field",
                placeholder: "Password",
                required: true,
                name: "session[password]",
                data: {
                  action: "focus->auth-modal#focusPassword blur->auth-modal#blurInput",
                  auth_modal_target: "passwordField"
                } %>
          <%= f.label :password, "Password", class: "input-label" %>
        </div>

        <%# Password Confirmation - 仅在注册模式下显示 %>
        <div class="input-group password-confirm-group" data-auth-modal-target="passwordConfirmGroup">
          <%= f.password_field :password_confirmation,
                class: "input-field",
                placeholder: "Confirm Password",
                name: "user[password_confirmation]",
                data: { action: "focus->auth-modal#focusPassword blur->auth-modal#blurInput" } %>
          <%= f.label :password_confirmation, "Confirm Password", class: "input-label" %>
        </div>

        <%# 记住我（可选）%>
        <input type="hidden" name="session[remember_me]" value="1">

        <%# 提交按钮 %>
        <%= f.submit "Enter",
              class: "auth-submit-btn",
              data: { auth_modal_target: "submitBtn" } %>
      <% end %>

      <%# 切换登录/注册模式 %>
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

### 步骤 3：创建 CSS 样式文件（推荐）

创建文件 `app/assets/stylesheets/auth_modal.css`：

```css
/* ============================================
   Auth Modal Styles
   ============================================
   Peter Cat 风格登录模态框样式

   特性：
   - CSS 变量便于主题定制
   - 流畅的过渡动画
   - 响应式设计
   ============================================ */

/* 引入字体 */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Montserrat:wght@300;400;600&display=swap');

/* CSS 变量 - 设计系统 */
:root {
    --auth-bg: #FDFBF7;           /* 米白色背景 */
    --auth-accent: #DC4C3E;       /* Peter Cat 红 */
    --auth-text-main: #292524;    /* 深灰主文字 */
    --auth-text-sub: #a8a29e;     /* 浅灰次要文字 */
    --auth-border: #e7e5e4;       /* 边框色 */
    --auth-error-bg: #fef2f2;     /* 错误背景 */
    --auth-error-border: #fecaca; /* 错误边框 */

    --font-serif: "Cormorant Garamond", serif;
    --font-sans: "Montserrat", sans-serif;

    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --shadow-card: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* ========== 1. 遮罩层 ========== */
.auth-backdrop {
    position: fixed;
    inset: 0;  /* 简写：top/right/bottom/left: 0 */
    z-index: 50;

    /* Flex 居中布局 */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;

    /* 背景模糊效果 */
    background-color: rgba(28, 25, 23, 0.2);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px); /* Safari 兼容 */

    /* 默认隐藏 */
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-medium), visibility var(--transition-medium);
}

/* 打开状态 */
.auth-backdrop.is-open {
    opacity: 1;
    visibility: visible;
}

/* 遮罩层点击区域 */
.auth-backdrop-overlay {
    position: absolute;
    inset: 0;
}

/* ========== 2. 模态卡片 ========== */
.auth-card {
    position: relative;
    width: 100%;
    max-width: 380px;

    background-color: var(--auth-bg);
    border: 1px solid var(--auth-border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
    overflow: hidden;

    /* 进场动画初始状态 */
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity var(--transition-medium), transform var(--transition-medium);
}

/* 打开时的动画 */
.auth-backdrop.is-open .auth-card {
    opacity: 1;
    transform: translateY(0);
}

/* ========== 3. 关闭按钮 ========== */
.auth-close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;

    background: none;
    border: none;
    padding: 0.25rem;
    color: var(--auth-text-sub);
    cursor: pointer;
    transition: color var(--transition-fast);
}

.auth-close-btn:hover {
    color: var(--auth-text-main);
}

/* ========== 4. 小猫动画 ========== */
.cat-wrapper {
    height: 160px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding-top: 1.5rem;
    position: relative;
    overflow: hidden;
}

/* SVG 样式 */
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

/* 动画组 */
.cat-face-group {
    transition: transform var(--transition-medium) ease-out;
}

.cat-eyes-group {
    transition: transform var(--transition-medium) ease;
}

.cat-paws-group {
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s;
    transform-origin: center bottom;
    opacity: 0;
    transform: translateY(50px); /* 默认隐藏在下方 */
}

/* 状态 A: 看着邮箱 */
.cat-wrapper.cat-looking .cat-face-group {
    transform: translateY(4px);
}

.cat-wrapper.cat-looking .cat-eyes-group {
    transform: translate(-2px, 2px);
}

/* 状态 B: 捂住眼睛 */
.cat-wrapper.cat-covering .cat-paws-group {
    opacity: 1;
    transform: translateY(0);
}

.cat-wrapper.cat-covering .cat-face-group {
    transform: translateY(0);
}

/* ========== 5. 标题 ========== */
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

/* ========== 6. 表单区域 ========== */
.auth-form-body {
    padding: 0 2rem 2rem 2rem;
}

/* 错误消息 */
.auth-error {
    background: var(--auth-error-bg);
    border: 1px solid var(--auth-error-border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    text-align: center;
}

.auth-error span {
    color: var(--auth-accent);
    font-size: 0.875rem;
    font-family: var(--font-sans);
}

/* 输入框组 */
.input-group {
    position: relative;
    margin-bottom: 1.25rem;
}

/* 密码确认字段 - 动态显示 */
.password-confirm-group {
    height: 0;
    margin-bottom: 0;
    opacity: 0;
    overflow: hidden;
    transition: height var(--transition-fast), opacity var(--transition-fast), margin var(--transition-fast);
}

.password-confirm-group.is-visible {
    height: 3.5rem;
    margin-bottom: 1.25rem;
    opacity: 1;
}

/* 输入框 */
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
    transition: border-color var(--transition-fast);
}

/* 关键：placeholder 透明但存在，用于 CSS 选择器 */
.input-field::placeholder {
    color: transparent;
}

.input-field:focus {
    border-color: var(--auth-accent);
}

/* 浮动标签 */
.input-label {
    position: absolute;
    left: 0;
    font-family: var(--font-sans);
    pointer-events: none;
    transition: all var(--transition-fast);

    /* 默认上浮状态（有值或聚焦） */
    top: -0.75rem;
    font-size: 0.75rem;
    color: var(--auth-text-sub);
    letter-spacing: 0.05em;
}

/* 聚焦时高亮 */
.input-field:focus + .input-label {
    color: var(--auth-accent);
}

/* 空值且未聚焦时：下沉显示 */
.input-field:placeholder-shown:not(:focus) + .input-label {
    top: 0.5rem;
    font-size: 1rem;
    color: var(--auth-text-sub);
}

/* ========== 7. 按钮 ========== */
.auth-submit-btn {
    width: 100%;
    margin-top: 1.5rem;
    padding: 0.75rem;

    background-color: var(--auth-accent);
    color: white;
    border: none;
    border-radius: 6px;

    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;

    transition: background-color var(--transition-fast), transform 0.1s;
    box-shadow: 0 4px 6px rgba(220, 76, 62, 0.2);
}

.auth-submit-btn:hover {
    background-color: #c93f32; /* 稍深的红色 */
}

.auth-submit-btn:active {
    transform: scale(0.98);
}

/* 切换模式链接 */
.auth-toggle-area {
    margin-top: 1rem;
    text-align: center;
}

.auth-toggle-link {
    background: none;
    border: none;
    padding: 0;

    font-family: var(--font-sans);
    font-size: 0.75rem;
    color: var(--auth-text-sub);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: var(--auth-border);
    cursor: pointer;
    transition: color var(--transition-fast);
}

.auth-toggle-link:hover {
    color: var(--auth-accent);
}

/* ========== 8. Join 触发按钮（首页用） ========== */
.nav-join-btn {
    position: fixed;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 40;

    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--auth-text-sub);
    background: none;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast);
}

.nav-join-btn:hover {
    color: var(--auth-accent);
}

/* ========== 响应式适配 ========== */
@media (max-width: 480px) {
    .auth-backdrop {
        padding: 0;
    }

    .auth-card {
        max-width: 100%;
        min-height: 100vh;
        border-radius: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .cat-wrapper {
        height: 140px;
    }
}

/* ========== 无障碍 ========== */
@media (prefers-reduced-motion: reduce) {
    .auth-backdrop,
    .auth-card,
    .cat-face-group,
    .cat-eyes-group,
    .cat-paws-group,
    .input-label,
    .input-field,
    .password-confirm-group {
        transition: none;
    }
}
```

然后在 `app/assets/config/manifest.js` 中添加：
```javascript
//= link auth_modal.css
```

在布局中引入：
```erb
<%# app/views/layouts/application.html.erb %>
<%= stylesheet_link_tag "auth_modal", "data-turbo-track": "reload" %>
```

---

### 步骤 4：配置后端控制器

修改 `app/controllers/sessions_controller.rb`：

```ruby
# ============================================
# SessionsController - 用户会话管理
# ============================================
class SessionsController < ApplicationController

  # GET /login - 登录页面
  # 渲染独立登录页面（非模态框模式使用）
  def new
    # 如果已登录，重定向到首页
    redirect_to root_path if logged_in?
  end

  # POST /login - 创建会话（登录）
  # 支持 HTML 表单提交和 AJAX/JSON 请求
  def create
    user = User.find_by(email: params[:session][:email])

    if user&.authenticate(params[:session][:password])
      # 登录成功
      log_in(user)
      remember(user) if params[:session][:remember_me] == "1"

      respond_to do |format|
        # HTML 表单提交：重定向
        format.html {
          flash[:notice] = "登录成功！"
          redirect_to root_path
        }

        # AJAX/JSON 请求：返回导航栏更新和用户信息
        format.json {
          render json: {
            success: true,
            message: "登录成功！",
            user: { id: user.id, email: user.email, nickname: user.nickname },
            nav_bar_html: render_nav_bar(user),
            flash_html: render_flash("登录成功！", :notice)
          }
        }
      end
    else
      # 登录失败
      respond_to do |format|
        format.html {
          flash.now[:alert] = "邮箱或密码错误"
          render :new, status: :unprocessable_entity
        }

        format.json {
          render json: {
            success: false,
            error: "邮箱或密码错误"
          }, status: :unauthorized
        }
      end
    end
  end

  # DELETE /logout - 销毁会话（登出）
  def destroy
    log_out if logged_in?
    redirect_to root_path, notice: "已登出"
  end

  private

  # 渲染导航栏 HTML（用于 AJAX 更新）
  def render_nav_bar(user)
    ApplicationController.render(
      partial: "shared/nav_bar",
      locals: { current_user: user }
    )
  end

  # 渲染 Flash 消息 HTML
  def render_flash(message, type)
    ApplicationController.render(
      partial: "shared/flash",
      locals: { message: message, type: type }
    )
  end
end
```

---

### 步骤 5：在页面中使用

编辑你想放置按钮的视图文件：

```erb
<%# app/views/home/index.html.erb %>

<%# 引入模态框样式 %>
<% content_for :head do %>
  <%= stylesheet_link_tag "auth_modal", "data-turbo-track": "reload" %>
<% end %>

<%# 必须包裹在 data-controller="auth-modal" 中 %>
<div data-controller="auth-modal">

  <%# 触发按钮 - 左上角 Join 按钮 %>
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
| 1 | 打开模态框 | 点击 Join 按钮 | 全屏遮罩出现，卡片居中显示，背景模糊 |
| 2 | 关闭动画 | 点击关闭按钮 | 模态框淡出消失，背景恢复 |
| 3 | 遮罩关闭 | 点击模态框外部 | 模态框关闭 |
| 4 | 小猫看邮箱 | 点击邮箱输入框 | 小猫眼睛向下移动 |
| 5 | 小猫捂眼 | 点击密码输入框 | 小猫爪子抬起遮住眼睛 |
| 6 | 输入恢复 | 点击空白处或切出输入框 | 小猫恢复默认状态 |
| 7 | 模式切换 | 点击 "Not a member? Join" | 标题变为 "join the club"，出现确认密码字段 |
| 8 | 模式切换回 | 点击 "Already a member? Enter" | 标题恢复 "peter-cat"，确认密码字段隐藏 |
| 9 | 表单提交 | 输入正确账号点击 Enter | 模态框关闭，导航栏显示用户信息，Toast 提示成功 |
| 10 | 错误提示 | 输入错误密码 | 显示红色错误消息，不刷新页面 |

---

## 常见问题

### Q1: 模态框不显示

**排查步骤：**
1. 浏览器控制台查看是否有 Stimulus 错误
2. 确认 `auth_modal_controller.js` 文件名和类名匹配（Stimulus 使用 kebab-case 映射）
3. 确认 `data-controller="auth-modal"` 正确包裹按钮和 partial
4. 检查 CSS 是否正确加载（检查 Network 面板）

### Q2: 小猫动画不生效

**检查点：**
- `data-auth-modal-target="catWrapper"` 是否在 `.cat-wrapper` 元素上
- 输入框的 `data-action` 是否绑定正确：
  ```erb
  data-action="focus->auth-modal#focusEmail blur->auth-modal#blurInput"
  ```

### Q3: AJAX 提交后页面刷新

**原因：** 表单没有阻止默认提交行为
**解决：** 确保 `data-action="submit->auth-modal#submitForm"` 正确绑定，且 controller 中有 `event.preventDefault()`

### Q4: 导航栏没有更新

**原因：** 后端没有返回 `nav_bar_html`
**解决：** 确保 `SessionsController#create` 的 JSON 响应中包含 `nav_bar_html`，且前端 `updateNavBar` 方法正确执行

### Q5: 如何修改按钮位置

编辑 `.nav-join-btn` 的 CSS：
```css
.nav-join-btn {
  position: fixed;
  top: 1.5rem;      /* 改为需要的值 */
  left: 1.5rem;     /* 改为 right: 1.5rem 放右边 */
  /* ... */
}
```

---

## 进阶定制

### 修改品牌颜色

在 `:root` 中修改主色调：
```css
:root {
  --auth-accent: #your-brand-color;
  --auth-bg: #your-background-color;
}
```

### 添加更多动画状态

可以在 controller 中添加：
```javascript
focusConfirmPassword() {
  this.resetCat()
  this.catWrapperTarget.classList.add("cat-double-covering")
}
```

### 集成第三方登录

在表单区域添加：
```erb
<div class="social-login">
  <%= link_to "GitHub 登录", "/auth/github",
      class: "github-login-btn",
      data: { turbo: false } %>
</div>
```

---

## 总结

通过以上步骤，即可在新项目中完整复刻 Peter Cat 风格的登录模态框。

**核心依赖：**
- Rails 7 + Hotwire/Stimulus
- 无需额外 JavaScript 库（如 jQuery）
- 纯 CSS 动画，性能优异
- 响应式设计，支持移动端

**设计亮点：**
- CSS 变量便于主题定制
- 渐进增强（无 JS 也能使用独立登录页）
- 无障碍支持（键盘导航、减少动画偏好）
- 模块化设计（可复用的 partial）
