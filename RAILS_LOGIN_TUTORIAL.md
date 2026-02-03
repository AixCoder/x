# 🌸 零基础 Rails 登录系统教程

> 专为女生设计的 Web 开发入门指南
> 从零开始，搭建带漂亮登录页面的完整网站

---

## 📋 目录

1. [准备工作](#一准备工作)
2. [创建新项目](#二创建新项目)
3. [安装必要工具](#三安装必要工具)
4. [创建用户系统](#四创建用户系统)
5. [添加登录页面](#五添加登录页面)
6. [实现登录功能](#六实现登录功能)
7. [实现注册功能](#七实现注册功能)
8. [连接登录页面](#八连接登录页面)
9. [测试你的应用](#九测试你的应用)
10. [常见问题](#十常见问题)

---

## 一、准备工作

### 1.1 你需要什么

| 工具 | 用途 | 下载地址 |
|------|------|----------|
| Ruby | 编程语言 | 已安装（Rails 需要） |
| Rails | Web 框架 | `gem install rails` |
| SQLite | 数据库 | 通常已内置 |
| 代码编辑器 | 写代码 | VS Code / RubyMine |
| 浏览器 | 查看效果 | Chrome / Safari |

### 1.2 检查 Rails 是否安装

打开终端（Terminal），输入：

```bash
rails --version
```

如果显示版本号（如 `Rails 7.1.0`），说明已安装。
如果提示 "command not found"，先安装 Rails：

```bash
gem install rails
```

---

## 二、创建新项目

### 2.1 生成 Rails 项目

在终端中，进入你想存放项目的文件夹（比如桌面）：

```bash
cd ~/Desktop
```

然后创建新项目（这里叫 `my_app`，你可以改名字）：

```bash
rails new my_app --css=tailwind
```

> 💡 `--css=tailwind` 表示使用 Tailwind CSS，让样式更好看

等待命令执行完成... ⏳

### 2.2 进入项目文件夹

```bash
cd my_app
```

### 2.3 启动服务器测试

```bash
bin/rails server
```

打开浏览器，访问：http://localhost:3000

如果看到 "Yay! You’re on Rails!" 的页面，恭喜你！🎉
项目创建成功了。

**按 `Ctrl+C` 停止服务器**，继续下一步。

---

## 三、安装必要工具

### 3.1 添加 bcrypt（密码加密）

编辑项目根目录下的 `Gemfile` 文件，找到下面这行：

```ruby
# gem "bcrypt", "~> 3.1.7"
```

删除前面的 `#`，变成：

```ruby
gem "bcrypt", "~> 3.1.7"
```

保存文件，然后在终端运行：

```bash
bundle install
```

> 💡 `bcrypt` 是用来加密密码的，这样即使数据库泄露，黑客也看不到真实密码

---

## 四、创建用户系统

### 4.1 生成用户模型

在终端运行：

```bash
bin/rails generate model User email:string password_digest:string
```

这行命令做了什么：
- 创建了 `User` 模型（代表用户）
- 添加了 `email` 字段（邮箱）
- 添加了 `password_digest` 字段（加密后的密码）

### 4.2 更新数据库

```bash
bin/rails db:migrate
```

> 💡 `db:migrate` 就是把刚才的改动应用到数据库里

### 4.3 配置用户模型

打开 `app/models/user.rb` 文件，改成这样：

```ruby
class User < ApplicationRecord
  has_secure_password

  validates :email, presence: true, uniqueness: true
end
```

**代码解释：**
- `has_secure_password`：自动处理密码加密
- `validates :email`：确保邮箱必填，且不能重复

---

## 五、添加登录页面

### 5.1 创建模态框文件

创建文件夹：

```bash
mkdir -p app/views/shared
```

创建文件 `app/views/shared/_auth_modal.html.erb`，把下面的代码完整复制进去：

```erb
<style>
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
  .auth-close-btn:hover { color: var(--auth-text-main); }

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
  .cat-eye { fill: var(--auth-accent); }

  .cat-face-group { transition: transform 0.3s ease-out; }
  .cat-eyes-group { transition: transform 0.3s ease; }
  .cat-paws-group {
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s;
    transform-origin: center bottom;
    opacity: 0;
    transform: translateY(50px);
  }

  .cat-wrapper.cat-looking .cat-face-group { transform: translateY(4px); }
  .cat-wrapper.cat-looking .cat-eyes-group { transform: translate(-2px, 2px); }
  .cat-wrapper.cat-covering .cat-paws-group { opacity: 1; transform: translateY(0); }
  .cat-wrapper.cat-covering .cat-face-group { transform: translateY(0); }

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

  .auth-form-body { padding: 0 2rem 2rem 2rem; }

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

<div class="auth-backdrop" data-auth-modal-target="backdrop">
  <div style="position:absolute; inset:0;" data-action="click->auth-modal#close"></div>

  <div class="auth-card">
    <button type="button" class="auth-close-btn" data-action="click->auth-modal#close">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>

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

    <div class="auth-title">
      <span data-auth-modal-target="titleText">peter-cat</span>
    </div>

    <div class="auth-form-body">
      <%= form_with url: login_path, method: :post, local: true do |f| %>
        <div class="input-group">
          <%= f.email_field :email, class: "input-field", placeholder: "Email", required: true,
                data: { action: "focus->auth-modal#focusEmail blur->auth-modal#blurInput" } %>
          <%= f.label :email, "Email Address", class: "input-label" %>
        </div>

        <div class="input-group">
          <%= f.password_field :password, class: "input-field", placeholder: "Password", required: true,
                data: { action: "focus->auth-modal#focusPassword blur->auth-modal#blurInput" } %>
          <%= f.label :password, "Password", class: "input-label" %>
        </div>

        <%= f.submit "Enter", class: "auth-submit-btn", data: { auth_modal_target: "submitBtn" } %>
      <% end %>

      <div class="auth-toggle-area">
        <%= link_to "Not a member? Join", signup_path, class: "auth-toggle-link" %>
      </div>
    </div>
  </div>
</div>
```

### 5.2 创建 Stimulus 控制器

创建文件夹：

```bash
mkdir -p app/javascript/controllers
```

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
        console.log("Auth modal controller connected")
    }

    open(e) {
        if (e) e.preventDefault()
        this.backdropTarget.classList.add("is-open")
    }

    close(e) {
        if (e) e.preventDefault()
        this.backdropTarget.classList.remove("is-open")
        this.resetCat()
    }

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

---

## 六、实现登录功能

### 6.1 创建会话控制器

在终端运行：

```bash
bin/rails generate controller Sessions new create destroy
```

### 6.2 配置登录路由

编辑 `config/routes.rb`，改成：

```ruby
Rails.application.routes.draw do
  # 首页
  root "home#index"

  # 登录/登出
  get    '/login',  to: 'sessions#new'
  post   '/login',  to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy'

  # 注册
  get  '/signup', to: 'users#new'
  post '/signup', to: 'users#create'
end
```

### 6.3 实现登录逻辑

打开 `app/controllers/sessions_controller.rb`，改成：

```ruby
class SessionsController < ApplicationController
  def new
  end

  def create
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      redirect_to root_path, notice: "欢迎回来！🎉"
    else
      redirect_to root_path, alert: "邮箱或密码错误"
    end
  end

  def destroy
    session[:user_id] = nil
    redirect_to root_path, notice: "已登出"
  end
end
```

**代码解释：**
- `user&.authenticate`：检查密码是否正确
- `session[:user_id]`：把用户ID存到会话里（登录状态）

### 6.4 添加当前用户方法

打开 `app/controllers/application_controller.rb`，改成：

```ruby
class ApplicationController < ActionController::Base
  helper_method :current_user, :logged_in?

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    !!current_user
  end
end
```

> 💡 `helper_method` 让这些方法在视图里也能用

---

## 七、实现注册功能

### 7.1 创建用户控制器

在终端运行：

```bash
bin/rails generate controller Users new create
```

### 7.2 实现注册逻辑

打开 `app/controllers/users_controller.rb`，改成：

```ruby
class UsersController < ApplicationController
  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)

    if @user.save
      session[:user_id] = @user.id
      redirect_to root_path, notice: "注册成功！欢迎！🎉"
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
```

### 7.3 创建注册页面

创建文件 `app/views/users/new.html.erb`：

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
    <h1 class="text-2xl font-bold text-center mb-6" style="color: #DC4C3E;">注册新账号</h1>

    <%= form_with model: @user, url: signup_path, local: true do |f| %>
      <% if @user.errors.any? %>
        <div class="bg-red-100 text-red-700 p-3 rounded mb-4">
          <% @user.errors.full_messages.each do |msg| %>
            <p><%= msg %></p>
          <% end %>
        </div>
      <% end %>

      <div class="mb-4">
        <%= f.label :email, "邮箱", class: "block text-gray-700 mb-2" %>
        <%= f.email_field :email, class: "w-full px-3 py-2 border rounded", required: true %>
      </div>

      <div class="mb-4">
        <%= f.label :password, "密码", class: "block text-gray-700 mb-2" %>
        <%= f.password_field :password, class: "w-full px-3 py-2 border rounded", required: true %>
      </div>

      <div class="mb-6">
        <%= f.label :password_confirmation, "确认密码", class: "block text-gray-700 mb-2" %>
        <%= f.password_field :password_confirmation, class: "w-full px-3 py-2 border rounded", required: true %>
      </div>

      <%= f.submit "注册", class: "w-full py-2 rounded text-white font-bold", style: "background-color: #DC4C3E;" %>
    <% end %>

    <p class="text-center mt-4 text-gray-600">
      已有账号？<%= link_to "立即登录", root_path, class: "text-red-500" %>
    </p>
  </div>
</div>
```

---

## 八、连接登录页面

### 8.1 创建首页

创建文件 `app/controllers/home_controller.rb`：

```ruby
class HomeController < ApplicationController
  def index
  end
end
```

创建文件 `app/views/home/index.html.erb`：

```erb
<!-- 导航栏 -->
<nav class="p-4 flex justify-end">
  <% if logged_in? %>
    <span class="mr-4">你好, <%= current_user.email %></span>
    <%= button_to "登出", logout_path, method: :delete, class: "text-red-500" %>
  <% else %>
    <%= link_to "登录", login_path, class: "mr-4 text-gray-600" %>
  <% end %>
</nav>

<!-- 页面内容 -->
<div class="container mx-auto text-center mt-20">
  <h1 class="text-4xl font-bold mb-4">欢迎来到我的网站</h1>
  <p class="text-gray-600">这是一个有漂亮登录页面的示例应用</p>
</div>

<!-- 登录模态框（仅未登录时显示） -->
<% unless logged_in? %>
  <div data-controller="auth-modal">
    <button type="button" class="nav-join-btn" data-action="click->auth-modal#open">
      Join
    </button>

    <%= render "shared/auth_modal" %>
  </div>
<% end %>
```

---

## 九、测试你的应用

### 9.1 启动服务器

```bash
bin/rails server
```

### 9.2 测试步骤

1. **访问首页**：http://localhost:3000
2. **点击 Join 按钮**：应该弹出漂亮的模态框
3. **测试小猫动画**：
   - 点击邮箱输入框 → 小猫眼睛移动
   - 点击密码输入框 → 小猫捂眼睛
4. **点击 "Not a member? Join"**：跳转到注册页面
5. **注册新账号**：填写邮箱和密码
6. **自动登录**：注册成功后应该显示 "欢迎回来"
7. **测试登出**：点击登出按钮

### 9.3 验证清单

| 功能 | 状态 |
|------|------|
| 点击 Join 打开模态框 | ☐ |
| 小猫看邮箱动画 | ☐ |
| 小猫捂眼动画 | ☐ |
| 关闭按钮有效 | ☐ |
| 点击遮罩关闭 | ☐ |
| 注册功能正常 | ☐ |
| 登录功能正常 | ☐ |
| 登出功能正常 | ☐ |

---

## 十、常见问题

### Q1: 提示 "Unable to autoload constant"

**解决：** 重启 Rails 服务器

### Q2: 样式不生效

**解决：** 检查 `application.html.erb` 是否有 `<%= stylesheet_link_tag "application" %>`

### Q3: 小猫动画不生效

**解决：** 检查浏览器控制台是否有 JavaScript 错误，确认 Stimulus 已正确安装

### Q4: 密码总是错误

**解决：** 确认 `has_secure_password` 已在 User 模型中添加

### Q5: 如何修改品牌色

编辑 `_auth_modal.html.erb` 中的：
```css
--auth-accent: #DC4C3E;  /* 改成你喜欢的颜色 */
```

---

## 🎉 恭喜！

你已经成功创建了一个带漂亮登录页面的完整 Web 应用！

**你学到的东西：**
- Rails 基础结构
- 用户认证系统
- 数据库操作
- Stimulus 前端交互
- CSS 动画

**下一步可以做什么：**
- 添加用户头像上传
- 实现密码重置功能
- 添加邮箱验证
- 美化注册页面

有问题随时提问，加油！💪
