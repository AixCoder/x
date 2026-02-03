# 教程一：Join 登录/注册功能实现教程

> 💡 适合前端小白的温柔教程，手把手教你实现一个漂亮的登录弹窗

## 一、先看效果

点击页面左上角的 **"Join"** 按钮，会弹出一个居中的卡片式登录框：
- 有只可爱的小猫 🐱，输入密码时它会捂住眼睛
- 可以切换登录和注册两种模式
- 登录成功后页面不刷新，导航栏直接变成用户状态

## 二、核心原理（不用怕，很简单）

### 1. 三个核心文件配合工作

```
页面上的按钮 ──► 触发 Stimulus 控制器 ──► 调用后端 API ──► 返回 JSON ──► 更新页面
     │                    │                      │                 │
     │                    │                      │                 └── 前端直接替换导航栏 HTML
     │                    │                      └── Rails 控制器处理登录/注册
     │                    └── auth_modal_controller.js（处理弹窗开关、表单提交）
     └── _auth_modal.html.erb（弹窗的 HTML 模板）
```

### 2. 技术栈说明

| 技术 | 作用 | 通俗解释 |
|------|------|---------|
| **Stimulus** | 前端交互框架 | 让按钮能"听懂"点击，控制弹窗显示/隐藏 |
| **Rails** | 后端框架 | 验证邮箱密码，创建用户，管理登录状态 |
| **Turbo** | 页面更新工具 | 让登录后不用刷新整个页面 |
| **localStorage** | 浏览器本地存储 | 暂时记住用户的登录状态（可选）|

## 三、逐步实现步骤

### 步骤 1：创建登录弹窗的 HTML 模板

创建文件 `app/views/shared/_auth_modal.html.erb`：

```erb
<%# 这是一个 partial（局部模板），可以被其他页面引用 %>

<%# 1. 遮罩层 - 半透明黑色背景，点击可以关闭弹窗 %>
<div class="auth-backdrop" data-auth-modal-target="backdrop">
  <%# 点击背景关闭弹窗 %>
  <div style="position:absolute; inset:0;" data-action="click->auth-modal#close"></div>

  <%# 2. 白色卡片 - 真正的登录框 %>
  <div class="auth-card">
    <%# 关闭按钮（X）%>
    <button type="button" data-action="click->auth-modal#close">✕</button>

    <%# 3. 小猫动画区域 %>
    <div class="cat-wrapper" data-auth-modal-target="catWrapper">
      <svg width="160" height="120">
        <%# 这里放 SVG 小猫图形，省略具体路径... %>
        <%# 小猫有眼睛和爪子两个部分可以动画 %>
      </svg>
    </div>

    <%# 4. 标题 %>
    <div class="auth-title">
      <span data-auth-modal-target="titleText">peter-cat</span>
    </div>

    <%# 5. 表单区域 %>
    <div class="auth-form-body">
      <%# form_with 是 Rails 的表单辅助方法 %>
      <%# data-action 表示提交时调用 auth-modal#submitForm %>
      <%= form_with url: login_path, method: :post, class: "auth-form",
            data: { turbo: false, action: "submit->auth-modal#submitForm", auth_modal_target: "form" } do |f| %>

        <%# 错误提示区域（默认隐藏）%>
        <div class="auth-error" data-auth-modal-target="errorMessage" style="display: none;">
          <span data-auth-modal-target="errorText"></span>
        </div>

        <%# 邮箱输入框 %>
        <div class="input-group">
          <%= f.email_field :email, class: "input-field", placeholder: "Email", required: true,
                name: "session[email]",
                data: { action: "focus->auth-modal#focusEmail blur->auth-modal#blurInput", auth_modal_target: "emailField" } %>
          <%= f.label :email, "Email Address", class: "input-label" %>
        </div>

        <%# 密码输入框 %>
        <div class="input-group">
          <%= f.password_field :password, class: "input-field", placeholder: "Password", required: true,
                name: "session[password]",
                data: { action: "focus->auth-modal#focusPassword blur->auth-modal#blurInput", auth_modal_target: "passwordField" } %>
          <%= f.label :password, "Password", class: "input-label" %>
        </div>

        <%# 密码确认 - 只在注册模式显示 %>
        <div class="input-group" data-auth-modal-target="passwordConfirmGroup" style="display: none;">
          <%= f.password_field :password_confirmation, class: "input-field", placeholder: "Confirm Password",
                name: "user[password_confirmation]",
                data: { action: "focus->auth-modal#focusPassword blur->auth-modal#blurInput" } %>
        </div>

        <%# 提交按钮 %>
        <%= f.submit "Enter", class: "auth-submit-btn", data: { auth_modal_target: "submitBtn" } %>
      <% end %>

      <%# 切换登录/注册的链接 %>
      <button type="button" data-action="click->auth-modal#toggleMode" data-auth-modal-target="toggleBtn">
        Not a member? Join
      </button>
    </div>
  </div>
</div>
```

**关键知识点：**
- `data-controller="auth-modal"` 表示这个区域由 Stimulus 的 auth-modal 控制器管理
- `data-action="click->auth-modal#close"` 表示点击时调用控制器的 close 方法
- `data-auth-modal-target="xxx"` 是给控制器用的"钩子"，可以在 JS 中通过 `this.xxxTarget` 访问

### 步骤 2：编写 Stimulus 控制器（前端逻辑）

创建文件 `app/javascript/controllers/auth_modal_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // 定义可以通过 this.xxxTarget 访问的 HTML 元素
  static targets = [
    "backdrop",           // 遮罩层
    "catWrapper",         // 小猫动画容器
    "titleText",          // 标题文字
    "submitBtn",          // 提交按钮
    "toggleBtn",          // 切换模式链接
    "errorMessage",       // 错误提示
    "errorText",          // 错误文字
    "form",               // 表单
    "emailField",         // 邮箱输入框
    "passwordField",      // 密码输入框
    "passwordConfirmGroup" // 密码确认组
  ]

  // 控制器初始化
  connect() {
    this.mode = "login"  // 默认是登录模式
    this.loginUrl = "/login"
    this.registerUrl = "/signup"
    this.updateTexts()
    this.updateFormFields()
  }

  // ========== 弹窗开关 ==========

  open() {
    // 给遮罩层添加 is-open 类，CSS 会让它显示出来
    this.backdropTarget.classList.add("is-open")
  }

  close() {
    this.backdropTarget.classList.remove("is-open")
    this.blurInput() // 重置小猫动画
  }

  // ========== 登录/注册模式切换 ==========

  toggleMode() {
    // 切换模式：login ↔ register
    this.mode = this.mode === "login" ? "register" : "login"
    this.updateTexts()
    this.updateFormFields()
    this.hideError()
  }

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

  updateFormFields() {
    // 注册模式显示密码确认字段
    if (this.mode === "register") {
      this.passwordConfirmGroupTarget.style.display = "block"
    } else {
      this.passwordConfirmGroupTarget.style.display = "none"
    }

    // 切换表单提交的 URL
    this.formTarget.action = this.mode === "login" ? this.loginUrl : this.registerUrl

    // 切换字段的 name 属性（后端需要不同的参数名）
    const prefix = this.mode === "login" ? "session" : "user"
    this.emailFieldTarget.name = `${prefix}[email]`
    this.passwordFieldTarget.name = `${prefix}[password]`
  }

  // ========== 小猫动画 ==========

  focusEmail() {
    this.resetCat()
    // 小猫看向邮箱（添加 CSS 类触发动画）
    this.catWrapperTarget.classList.add("cat-looking")
  }

  focusPassword() {
    this.resetCat()
    // 小猫捂住眼睛
    this.catWrapperTarget.classList.add("cat-covering")
  }

  blurInput() {
    this.resetCat()
  }

  resetCat() {
    this.catWrapperTarget.classList.remove("cat-looking", "cat-covering")
  }

  // ========== 表单提交 ==========

  async submitForm(event) {
    event.preventDefault() // 阻止表单默认提交

    this.hideError()
    this.updateFormFields() // 确保字段名正确

    const form = event.target
    const formData = new FormData(form)
    const submitUrl = this.mode === "login" ? this.loginUrl : this.registerUrl

    // 获取 CSRF token（Rails 安全机制需要）
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',  // 告诉后端我要 JSON 格式
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.handleSuccess(data)
      } else {
        const data = await response.json()
        this.showError(data.error || "操作失败")
      }
    } catch (error) {
      console.error("请求失败:", error)
      this.showError("网络错误，请重试")
    }
  }

  handleSuccess(data) {
    // 关闭弹窗
    this.close()

    // 显示成功提示
    this.showToast(data.message || "成功！")

    // 更新导航栏（后端返回了新的导航栏 HTML）
    if (data.nav_bar_html) {
      document.getElementById('nav-bar').outerHTML = data.nav_bar_html
    }

    // 触发登录成功事件（其他组件可以监听）
    document.dispatchEvent(new CustomEvent('auth:login:success', { detail: data.user }))
  }

  // ========== 错误提示 ==========

  showError(message) {
    // 翻译英文错误为中文
    const translations = {
      "Email has already been taken": "该邮箱已被注册",
      "Password is too short": "密码太短（至少6位）",
      "Password confirmation doesn't match": "两次密码不一致"
    }
    this.errorTextTarget.textContent = translations[message] || message
    this.errorMessageTarget.style.display = 'block'
  }

  hideError() {
    this.errorMessageTarget.style.display = 'none'
  }

  showToast(message) {
    // 创建临时提示框，2秒后消失
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8); color: white;
      padding: 1rem 2rem; border-radius: 12px;
      z-index: 9999;
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }
}
```

### 步骤 3：后端控制器处理

Rails 需要处理登录和注册请求，返回 JSON 而不是跳转页面。

**SessionsController**（处理登录）：

```ruby
class SessionsController < ApplicationController
  def create
    email = params[:session][:email]&.downcase
    password = params[:session][:password]

    user = User.find_by(email: email)

    if user&.authenticate(password)
      # 登录成功，设置 session
      session[:user_id] = user.id

      respond_to do |format|
        format.json {
          render json: {
            success: true,
            message: "欢迎回来！",
            user: { id: user.id, email: user.email },
            # 返回导航栏 HTML，前端直接替换
            nav_bar_html: render_to_string(partial: "shared/nav_bar", layout: false, formats: [:html])
          }
        }
      end
    else
      respond_to do |format|
        format.json { render json: { error: "邮箱或密码错误" }, status: :unauthorized }
      end
    end
  end
end
```

**UsersController**（处理注册）：

```ruby
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)

    if @user.save
      session[:user_id] = @user.id  # 自动登录

      respond_to do |format|
        format.json {
          render json: {
            success: true,
            message: "欢迎加入！",
            user: { id: @user.id, email: @user.email },
            nav_bar_html: render_to_string(partial: "shared/nav_bar", layout: false, formats: [:html])
          }
        }
      end
    else
      respond_to do |format|
        format.json { render json: { error: @user.errors.full_messages.join("，") }, status: :unprocessable_entity }
      end
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
```

### 步骤 4：在页面中使用

在首页 `app/views/home/index.html.erb` 中：

```erb
<%# 整个区域由 auth-modal 控制器管理 %>
<div data-controller="auth-modal">
  <%# 导航栏 %>
  <%= render "shared/nav_bar" %>

  <%# 页面内容... %>

  <%# 左上角的 Join 按钮 %>
  <button type="button" class="nav-join-btn" data-action="click->auth-modal#open">
    Join
  </button>

  <%# 引入登录弹窗 %>
  <%= render "shared/auth_modal" %>
</div>
```

## 四、关键设计技巧

### 1. 模式切换时如何改变表单字段？

登录和注册需要提交到不同 URL，且字段名不同：
- 登录: `session[email]`, `session[password]` → POST `/login`
- 注册: `user[email]`, `user[password]` → POST `/signup`

通过 `updateFormFields()` 方法动态修改 `name` 属性。

### 2. 为什么用 `outerHTML` 更新导航栏？

后端返回完整的导航栏 HTML 字符串，前端直接替换整个元素，这样可以：
- 保持页面其他部分不变
- 导航栏立即显示登录状态
- 新导航栏的按钮也能正常工作

### 3. 小猫动画怎么实现？

通过给容器添加/移除 CSS 类来控制：
```css
.cat-wrapper.cat-looking .cat-eyes-group {
  transform: translate(-2px, 2px); /* 眼睛移动 */
}

.cat-wrapper.cat-covering .cat-paws-group {
  opacity: 1;
  transform: translateY(0); /* 爪子升起 */
}
```

## 五、常见问题

**Q: 弹窗为什么打不开？**
A: 检查 `data-controller="auth-modal"` 是否在正确的父元素上，按钮的 `data-action` 是否正确。

**Q: 提交后报错 "Can't verify CSRF token"？**
A: 确保请求头中加了 `'X-CSRF-Token': csrfToken`。

**Q: 登录成功后页面刷新了？**
A: 确保 `event.preventDefault()` 被调用，且没有表单默认提交。

---

下一篇教程：[红心本地收藏功能实现](./TUTORIAL_2_FAVORITE_LOCAL.md)
