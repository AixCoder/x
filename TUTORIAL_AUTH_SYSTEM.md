# Rails + Stimulus 登录注册系统完整教程

> 🔐 包含密码加密、Session管理、持久化登录的企业级认证方案

## 目录

1. [功能概览](#一功能概览)
2. [数据库设计](#二数据库设计)
3. [后端实现](#三后端实现)
4. [前端实现](#四前端实现)
5. [安全机制详解](#五安全机制详解)
6. [迁移指南](#六迁移到其他项目)

---

## 一、功能概览

### 1.1 实现的功能

| 功能 | 说明 |
|------|------|
| **用户注册** | 邮箱验证、密码加密存储、自动登录 |
| **用户登录** | Session认证、可选"记住我"30天 |
| **密码安全** | bcrypt加密、带盐值、不可逆 |
| **状态保持** | 刷新页面保持登录、关闭浏览器可选保持 |
| **无刷新体验** | 弹窗登录、成功后局部更新页面 |

### 1.2 技术栈

```
后端: Rails 7 + bcrypt + Session/Cookie
前端: Stimulus + Fetch API + 模态框
安全: CSRF防护、HttpOnly Cookie、密码加密
```

---

## 二、数据库设计

### 2.1 创建用户表

```bash
rails generate migration CreateUsers
```

编辑迁移文件：

```ruby
class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string :email,           null: false  # 邮箱（唯一）
      t.string :password_digest, null: false  # 加密后的密码
      t.string :nickname                       # 昵称（可选）

      t.timestamps
    end

    # 添加索引加速查询
    add_index :users, :email, unique: true
  end
end
```

**为什么用 `password_digest` 而不是 `password`？**

```
password        → 明文密码（绝不存储！）
password_digest → bcrypt加密后的字符串（存储这个）

示例:
输入密码: "123456"
存储值: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G"
```

执行迁移：
```bash
rails db:migrate
```

### 2.2 User模型配置

`app/models/user.rb`：

```ruby
class User < ApplicationRecord
  # 启用bcrypt密码加密
  # 自动提供 password 和 password_confirmation 虚拟属性
  # 自动提供 authenticate 方法验证密码
  has_secure_password

  # 邮箱验证
  validates :email,
    presence: true,                    # 不能为空
    uniqueness: { case_sensitive: false }, # 不区分大小写唯一
    format: { with: URI::MailTo::EMAIL_REGEXP } # 邮箱格式

  # 密码验证（创建时必须，更新时可空）
  validates :password,
    length: { minimum: 6 },
    if: -> { new_record? || password.present? }
end
```

**`has_secure_password` 做了什么？**

```ruby
# 1. 加密存储
user = User.create(
  email: "test@example.com",
  password: "123456"           # 自动加密存储到 password_digest
)

# 2. 密码验证
user.authenticate("123456")    # => 返回user对象（正确）
user.authenticate("wrong")     # => false（错误）

# 3. 密码确认
User.create(
  password: "123456",
  password_confirmation: "123456"  # 必须一致
)
```

---

## 三、后端实现

### 3.1 ApplicationController（基础方法）

`app/controllers/application_controller.rb`：

```ruby
class ApplicationController < ActionController::Base
  # 让视图也能用这些方法
  helper_method :current_user, :logged_in?

  private

  # ============================================
  # 获取当前登录用户
  # ============================================
  def current_user
    # 记忆化：避免重复查询数据库
    return @current_user if defined?(@current_user)

    # 1. 优先从session获取
    user_id = session[:user_id]

    # 2. session没有，尝试remember me cookie
    if user_id.nil?
      user_id = cookies.signed[:user_id]
      if user_id
        # 恢复session
        session[:user_id] = user_id
      end
    end

    # 3. 查询用户
    @current_user = User.find_by(id: user_id)
  end

  # ============================================
  # 检查是否已登录
  # ============================================
  def logged_in?
    !!current_user  # 转换为布尔值
  end

  # ============================================
  # 要求必须登录（用于保护页面）
  # ============================================
  def require_login
    unless logged_in?
      render json: { error: "请先登录" }, status: :unauthorized
    end
  end

  # ============================================
  # 要求必须未登录（用于登录/注册页面）
  # ============================================
  def require_no_login
    if logged_in?
      redirect_to root_path, notice: "您已经登录了"
    end
  end
end
```

### 3.2 SessionsController（登录/登出）

`app/controllers/sessions_controller.rb`：

```ruby
class SessionsController < ApplicationController
  before_action :require_no_login, only: [:new, :create]

  # POST /login
  def create
    # 1. 查找用户
    user = User.find_by(email: params[:session][:email]&.downcase)

    # 2. 验证密码
    if user&.authenticate(params[:session][:password])
      # ========== 登录成功 ==========

      # 设置session（浏览器关闭即失效）
      session[:user_id] = user.id

      # 处理"记住我"（30天持久登录）
      if params[:session][:remember_me] == "1"
        set_remember_me_cookie(user.id)
      end

      # 返回JSON响应（前端无刷新更新）
      render json: {
        success: true,
        message: "欢迎回来！",
        user: { id: user.id, email: user.email, nickname: user.nickname },
        nav_bar_html: render_to_string(
          partial: "shared/nav_bar",
          layout: false,
          formats: [:html]
        )
      }
    else
      # ========== 登录失败 ==========
      render json: {
        success: false,
        error: "邮箱或密码错误"
      }, status: :unauthorized
    end
  end

  # DELETE /logout
  def destroy
    # 清除session
    session[:user_id] = nil

    # 清除remember me cookie
    cookies.delete(:user_id)

    redirect_to root_path, notice: "已成功登出"
  end

  private

  # 设置持久化cookie（30天）
  def set_remember_me_cookie(user_id)
    cookies.signed[:user_id] = {
      value: user_id,
      expires: 30.days,
      httponly: true,              # 禁止JavaScript读取
      secure: Rails.env.production?  # 生产环境只允许HTTPS
    }
  end
end
```

### 3.3 UsersController（注册）

`app/controllers/users_controller.rb`：

```ruby
class UsersController < ApplicationController
  before_action :require_no_login, only: [:new, :create]

  # POST /signup
  def create
    @user = User.new(user_params)

    if @user.save
      # ========== 注册成功 ==========

      # 自动登录
      session[:user_id] = @user.id

      render json: {
        success: true,
        message: "欢迎加入！",
        user: {
          id: @user.id,
          email: @user.email,
          nickname: @user.nickname
        },
        nav_bar_html: render_to_string(
          partial: "shared/nav_bar",
          layout: false,
          formats: [:html]
        )
      }
    else
      # ========== 注册失败 ==========
      render json: {
        success: false,
        error: @user.errors.full_messages.join("，")
      }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation, :nickname)
  end
end
```

### 3.4 路由配置

`config/routes.rb`：

```ruby
Rails.application.routes.draw do
  # 登录
  post   'login',  to: 'sessions#create'
  delete 'logout', to: 'sessions#destroy'

  # 注册
  post 'signup', to: 'users#create'

  # 首页
  root 'home#index'
end
```

---

## 四、前端实现

### 4.1 登录模态框模板

`app/views/shared/_auth_modal.html.erb`：

```erb
<%# 遮罩层 %>
<div class="auth-backdrop" data-auth-modal-target="backdrop">
  <%# 点击背景关闭 %>
  <div class="backdrop-overlay" data-action="click->auth-modal#close"></div>

  <%# 登录卡片 %>
  <div class="auth-card">
    <%# 关闭按钮 %>
    <button type="button" class="close-btn" data-action="click->auth-modal#close">
      ✕
    </button>

    <%# 标题 %>
    <h2 data-auth-modal-target="titleText">登录</h2>

    <%# 错误提示 %>
    <div class="error-message" data-auth-modal-target="errorMessage" style="display: none;">
      <span data-auth-modal-target="errorText"></span>
    </div>

    <%# 表单 %>
    <%= form_with url: login_path, method: :post, class: "auth-form",
          data: {
            turbo: false,
            action: "submit->auth-modal#submitForm",
            auth_modal_target: "form"
          } do |f| %>

      <%# 邮箱 %>
      <div class="form-group">
        <%= f.email_field :email,
              class: "form-input",
              placeholder: "邮箱",
              required: true,
              name: "session[email]",
              data: { auth_modal_target: "emailField" } %>
      </div>

      <%# 密码 %>
      <div class="form-group">
        <%= f.password_field :password,
              class: "form-input",
              placeholder: "密码",
              required: true,
              name: "session[password]",
              data: { auth_modal_target: "passwordField" } %>
      </div>

      <%# 密码确认（仅注册模式显示）%>
      <div class="form-group" data-auth-modal-target="passwordConfirmGroup" style="display: none;">
        <%= f.password_field :password_confirmation,
              class: "form-input",
              placeholder: "确认密码",
              name: "user[password_confirmation]" %>
      </div>

      <%# 记住我（仅登录模式）%>
      <div class="form-group remember-me" data-auth-modal-target="rememberMeGroup">
        <%= f.check_box :remember_me, id: "remember_me" %>
        <%= f.label :remember_me, "记住我（30天）" %>
      </div>

      <%# 提交按钮 %>
      <%= f.submit "登录",
            class: "submit-btn",
            data: { auth_modal_target: "submitBtn" } %>
    <% end %>

    <%# 切换登录/注册 %>
    <button type="button"
            class="toggle-mode-btn"
            data-action="click->auth-modal#toggleMode"
            data-auth-modal-target="toggleBtn">
      还没有账号？立即注册
    </button>
  </div>
</div>
```

### 4.2 Stimulus控制器

`app/javascript/controllers/auth_modal_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class AuthModalController extends Controller {
  // 目标元素
  static targets = [
    "backdrop", "form", "titleText", "submitBtn", "toggleBtn",
    "errorMessage", "errorText", "emailField", "passwordField",
    "passwordConfirmGroup", "rememberMeGroup"
  ]

  // 初始化
  connect() {
    this.mode = "login"  // 当前模式：login / register
    this.loginUrl = "/login"
    this.registerUrl = "/signup"
  }

  // ========== 弹窗控制 ==========

  open() {
    this.mode = "login"
    this.updateUI()
    this.backdropTarget.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  close() {
    this.backdropTarget.classList.remove("is-open")
    document.body.style.overflow = ""
    this.hideError()
  }

  // ========== 模式切换 ==========

  toggleMode() {
    this.mode = this.mode === "login" ? "register" : "login"
    this.updateUI()
    this.hideError()
  }

  updateUI() {
    if (this.mode === "login") {
      this.titleTextTarget.textContent = "登录"
      this.submitBtnTarget.value = "登录"
      this.toggleBtnTarget.textContent = "还没有账号？立即注册"
      this.passwordConfirmGroupTarget.style.display = "none"
      this.rememberMeGroupTarget.style.display = "block"
      this.formTarget.action = this.loginUrl
      this.setFieldNames("session")
    } else {
      this.titleTextTarget.textContent = "注册"
      this.submitBtnTarget.value = "注册"
      this.toggleBtnTarget.textContent = "已有账号？立即登录"
      this.passwordConfirmGroupTarget.style.display = "block"
      this.rememberMeGroupTarget.style.display = "none"
      this.formTarget.action = this.registerUrl
      this.setFieldNames("user")
    }
  }

  setFieldNames(prefix) {
    this.emailFieldTarget.name = `${prefix}[email]`
    this.passwordFieldTarget.name = `${prefix}[password]`
  }

  // ========== 表单提交 ==========

  async submitForm(event) {
    event.preventDefault()

    const form = event.target
    const formData = new FormData(form)
    const url = this.mode === "login" ? this.loginUrl : this.registerUrl

    this.hideError()

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfToken
        }
      })

      const data = await response.json()

      if (response.ok) {
        this.handleSuccess(data)
      } else {
        this.showError(data.error)
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
    this.showToast(data.message)

    // 更新导航栏（无刷新）
    if (data.nav_bar_html) {
      const navBar = document.getElementById("nav-bar")
      if (navBar) navBar.outerHTML = data.nav_bar_html
    }

    // 派发登录成功事件
    document.dispatchEvent(new CustomEvent("auth:login:success", {
      detail: data.user
    }))
  }

  // ========== 错误处理 ==========

  showError(message) {
    this.errorTextTarget.textContent = this.translateError(message)
    this.errorMessageTarget.style.display = "block"
  }

  hideError() {
    this.errorMessageTarget.style.display = "none"
  }

  translateError(message) {
    const translations = {
      "Email has already been taken": "该邮箱已被注册",
      "Password is too short": "密码太短（至少6位）",
      "Password confirmation doesn't match": "两次密码不一致",
      "Invalid email or password": "邮箱或密码错误"
    }
    return translations[message] || message
  }

  showToast(message) {
    const toast = document.createElement("div")
    toast.className = "toast-message"
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }

  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
```

### 4.3 导航栏组件

`app/views/shared/_nav_bar.html.erb`：

```erb
<nav class="nav-bar" id="nav-bar">
  <% if logged_in? %>
    <%# 已登录状态 %>
    <div class="user-info">
      <span class="user-name">
        <%= current_user.nickname.presence || current_user.email %>
      </span>
      <%= button_to "登出", logout_path,
            method: :delete,
            class: "nav-button logout-btn" %>
    </div>
  <% else %>
    <%# 未登录状态 %>
    <div class="auth-links">
      <button type="button"
              class="nav-button login-btn"
              data-action="click->auth-modal#open">
        登录
      </button>
      <button type="button"
              class="nav-button signup-btn"
              data-action="click->auth-modal#openRegister">
        注册
      </button>
    </div>
  <% end %>
</nav>
```

---

## 五、安全机制详解

### 5.1 密码加密流程

```
用户输入: "myPassword123"
     ↓
bcrypt加密 (成本因子12)
     ↓
生成: "$2a$12$Z3VycnlYSrEXvUVJz1QzXeDz5VqW8XJHB..."
     ↓
存储到 password_digest 字段
```

**特点：**
- 不可逆：无法从密文反推密码
- 带盐值：相同密码存储值不同
- 慢哈希：防止暴力破解

### 5.2 Session与Cookie机制

| 机制 | 用途 | 有效期 | 安全性 |
|------|------|--------|--------|
| `session[:user_id]` | 短期登录状态 | 浏览器关闭即失效 | 加密cookie |
| `cookies.signed[:user_id]` | 持久登录 | 30天（可选） | 签名防篡改 |

**记住我流程：**
```
登录时勾选"记住我"
     ↓
设置session + 设置30天cookie
     ↓
关闭浏览器再打开
     ↓
session没有了，读取cookie
     ↓
恢复session，保持登录
```

### 5.3 CSRF防护

所有POST请求自动包含CSRF token：
```javascript
headers: {
  "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content
}
```

---

## 六、迁移到其他项目

### 6.1 文件清单

需要复制到新项目的文件：

```
后端文件:
├── app/models/user.rb
├── app/controllers/application_controller.rb
├── app/controllers/sessions_controller.rb
├── app/controllers/users_controller.rb
├── app/views/shared/_auth_modal.html.erb
├── app/views/shared/_nav_bar.html.erb
├── db/migrate/xxxx_create_users.rb
└── config/routes.rb (添加路由)

前端文件:
└── app/javascript/controllers/auth_modal_controller.js

Gemfile:
└── gem "bcrypt", "~> 3.1.7"
```

### 6.2 快速迁移步骤

**步骤1：添加依赖**
```bash
# Gemfile
gem "bcrypt", "~> 3.1.7"

bundle install
```

**步骤2：复制模型和控制器**
- 复制 `app/models/user.rb`
- 复制 `app/controllers/application_controller.rb` 中的方法
- 复制 `app/controllers/sessions_controller.rb`
- 复制 `app/controllers/users_controller.rb`

**步骤3：数据库迁移**
```bash
rails generate migration CreateUsers
# 编辑迁移文件（见2.1节）
rails db:migrate
```

**步骤4：添加路由**
```ruby
# config/routes.rb
post   'login',  to: 'sessions#create'
delete 'logout', to: 'sessions#destroy'
post   'signup', to: 'users#create'
```

**步骤5：复制视图文件**
- 复制 `app/views/shared/_auth_modal.html.erb`
- 复制 `app/views/shared/_nav_bar.html.erb`

**步骤6：复制前端控制器**
- 复制 `app/javascript/controllers/auth_modal_controller.js`

**步骤7：在布局中添加**
```erb
<!-- app/views/layouts/application.html.erb -->
<body>
  <div data-controller="auth-modal">
    <%= render "shared/nav_bar" %>

    <%= yield %>

    <%= render "shared/auth_modal" %>
  </div>
</body>
```

### 6.3 自定义修改点

| 修改点 | 文件 | 说明 |
|--------|------|------|
| 登录后跳转 | `auth_modal_controller.js` | 修改 `handleSuccess` |
| 密码复杂度 | `user.rb` | 修改 `validates :password` |
| 记住我时长 | `sessions_controller.rb` | 修改 `expires: 30.days` |
| 界面样式 | `_auth_modal.html.erb` | 修改CSS类名 |

### 6.4 测试清单

迁移后验证以下功能：

- [ ] 可以注册新用户
- [ ] 密码正确加密存储（检查数据库）
- [ ] 可以使用正确密码登录
- [ ] 错误密码提示失败
- [ ] 刷新页面保持登录
- [ ] 关闭浏览器后（勾选记住我）仍保持登录
- [ ] 可以正常登出
- [ ] CSRF token正常传递

---

## 附录：常见问题

**Q: 如何修改密码最小长度？**
```ruby
# app/models/user.rb
validates :password, length: { minimum: 8 }  # 改为8位
```

**Q: 如何延长记住我时间？**
```ruby
# app/controllers/sessions_controller.rb
cookies.signed[:user_id] = {
  value: user_id,
  expires: 90.days  # 改为90天
}
```

**Q: 如何添加手机号注册？**
```ruby
# 迁移文件
t.string :phone
add_index :users, :phone, unique: true

# 模型
validates :phone, presence: true, uniqueness: true
```

---

**教程完成！** 你现在拥有了一套完整的、可复用的登录注册系统。
