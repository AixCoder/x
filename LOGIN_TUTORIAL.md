# 🔐 Rails 7 登录功能完整教程

> 手把手教你用 Ruby on Rails 实现邮箱+密码登录功能

---

## 📚 目录

1. [前置知识](#前置知识)
2. [核心概念](#核心概念)
3. [实现步骤](#实现步骤)
4. [代码详解](#代码详解)
5. [常见问题](#常见问题)

---

## 前置知识

在开始之前，请确保你已掌握：
- Rails 基础（MVC 架构、路由、控制器）
- Ruby 基础语法
- HTML 表单基础

---

## 核心概念

### 1. Session（会话）是什么？

**Session** 是 Web 开发中用于在多个请求之间保持用户状态的机制。

想象一下 HTTP 协议：
```
浏览器 → 请求 1 → 服务器 → 响应 1 → 浏览器（断开）
浏览器 → 请求 2 → 服务器 → 响应 2 → 浏览器（断开）
```

每次请求都是独立的，服务器"忘记"了之前的请求。Session 解决了这个问题：

```
浏览器 → 请求 1 + Session ID → 服务器
服务器 → 响应 1 + Set-Cookie: session_id=xxx → 浏览器

浏览器 → 请求 2 + Cookie: session_id=xxx → 服务器
服务器 → "哦，是用户 #123" → 响应 2
```

**Rails 中的 Session：**
```ruby
# 存储数据到 session
session[:user_id] = user.id

# 从 session 读取数据
session[:user_id]  # => 123

# 清除 session
session[:user_id] = nil
```

### 2. 密码为什么要加密？

**绝对不能**以明文存储密码！原因：
- 数据库泄露会导致所有用户密码暴露
- 很多用户在不同网站使用相同密码

**解决方案：单向哈希加密**

```
用户输入: "mypassword123"
         ↓
    bcrypt 加密
         ↓
存储到数据库: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6T..."
```

验证时：
```
用户输入: "mypassword123"
         ↓
    bcrypt(输入) == 数据库中的值 ?
         ↓
    是 → 密码正确
    否 → 密码错误
```

**bcrypt 是 Rails 的标准加密方案**，会自动处理盐值(salt)和计算成本。

---

## 实现步骤

### 第 1 步：启用 bcrypt

编辑 `Gemfile`，取消 bcrypt 的注释：

```ruby
# 找到这一行
gem "bcrypt", "~> 3.1.7"
```

安装：
```bash
bundle install
```

### 第 2 步：创建 User 模型

生成模型：
```bash
rails generate model User email:string password_digest:string
```

**为什么是 password_digest 而不是 password？**
- `password` 是虚拟属性（用户输入，不存储）
- `password_digest` 是加密后的密码（存储到数据库）

编辑迁移文件 `db/migrate/xxx_create_users.rb`：

```ruby
class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users do |t|
      t.string :email, null: false      # 邮箱不能为空
      t.string :password_digest, null: false  # 密码不能为空

      t.timestamps
    end

    # 添加唯一索引，确保邮箱不重复
    add_index :users, :email, unique: true
  end
end
```

运行迁移：
```bash
rails db:migrate
```

编辑模型 `app/models/user.rb`：

```ruby
class User < ApplicationRecord
  # 启用密码加密功能
  # 这会添加 password 和 password_confirmation 虚拟属性
  # 以及 authenticate 方法
  has_secure_password

  # 验证规则
  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }

  validates :password, length: { minimum: 6 }, if: -> { password.present? }
end
```

### 第 3 步：创建 Sessions 控制器

生成控制器：
```bash
rails generate controller Sessions
```

编辑 `app/controllers/sessions_controller.rb`：

```ruby
class SessionsController < ApplicationController
  # GET /login - 显示登录表单
  def new
  end

  # POST /login - 处理登录
  def create
    # 1. 查找用户
    user = User.find_by(email: params[:email]&.downcase)

    # 2. 验证密码
    if user&.authenticate(params[:password])
      # 登录成功！将用户 ID 存入 session
      session[:user_id] = user.id
      flash[:notice] = "登录成功！"
      redirect_to root_path
    else
      # 登录失败
      flash.now[:alert] = "邮箱或密码错误"
      render :new, status: :unprocessable_entity
    end
  end

  # DELETE /logout - 处理登出
  def destroy
    session[:user_id] = nil
    flash[:notice] = "已登出"
    redirect_to root_path
  end
end
```

### 第 4 步：配置路由

编辑 `config/routes.rb`：

```ruby
Rails.application.routes.draw do
  root "home#index"

  # 登录路由
  get    "login",  to: "sessions#new"
  post   "login",  to: "sessions#create"
  delete "logout", to: "sessions#destroy"

  # 注册路由
  get  "signup", to: "users#new"
  post "signup", to: "users#create"
end
```

### 第 5 步：添加辅助方法

编辑 `app/controllers/application_controller.rb`：

```ruby
class ApplicationController < ActionController::Base
  # 让视图也能使用这些方法
  helper_method :current_user, :logged_in?

  private

  # 获取当前登录用户
  # 使用 ||= 进行记忆化，避免重复查询数据库
  def current_user
    @current_user ||= User.find_by(id: session[:user_id])
  end

  # 检查是否已登录
  def logged_in?
    !!current_user
  end

  # 要求必须登录（用于保护页面）
  def authenticate_user!
    unless logged_in?
      flash[:alert] = "请先登录"
      redirect_to login_path
    end
  end
end
```

### 第 6 步：创建登录视图

创建文件 `app/views/sessions/new.html.erb`：

```erb
<h1>登录</h1>

<%# 显示错误信息 %>
<% if flash[:alert] %>
  <div class="alert"><%= flash[:alert] %></div>
<% end %>

<%# 登录表单 %>
<%= form_with url: login_path, data: { turbo: false } do |f| %>
  <div>
    <%= f.label :email, "邮箱" %>
    <%= f.email_field :email, required: true %>
  </div>

  <div>
    <%= f.label :password, "密码" %>
    <%= f.password_field :password, required: true %>
  </div>

  <%= f.submit "登录" %>
<% end %>

<p>还没有账号？<%= link_to "立即注册", signup_path %></p>
```

### 第 7 步：更新首页显示登录状态

编辑 `app/views/home/index.html.erb`：

```erb
<%# 导航栏 %>
<nav>
  <% if logged_in? %>
    <span>欢迎，<%= current_user.email %></span>
    <%= button_to "登出", logout_path, method: :delete %>
  <% else %>
    <%= link_to "登录", login_path %>
    <%= link_to "注册", signup_path %>
  <% end %>
</nav>

<%# 页面内容 %>
<h1>日本文学名言</h1>
<p><%= @quotes %></p>
```

---

## 代码详解

### has_secure_password 做了什么？

当你添加 `has_secure_password` 后，Rails 自动为你提供了：

```ruby
# 虚拟属性（不会存储到数据库）
user = User.new
user.password = "secret"              # 设置密码
user.password_confirmation = "secret" # 确认密码

# 保存时自动加密
user.save
# 数据库中存储的是: "$2a$12$xxxxxxxx..."

# 验证密码
user.authenticate("secret")     # => user 对象（验证成功）
user.authenticate("wrong")      # => false（验证失败）
```

### current_user 的记忆化技巧

```ruby
def current_user
  @current_user ||= User.find_by(id: session[:user_id])
end
```

这行代码的意思是：
1. 如果 `@current_user` 已经有值，直接返回（不再查询数据库）
2. 如果 `@current_user` 为 nil，查询数据库并赋值给 `@current_user`

这样每个请求只查询一次数据库，提高效率。

### flash vs flash.now

```ruby
# flash - 在下一次请求显示（用于 redirect）
flash[:notice] = "登录成功"
redirect_to root_path

# flash.now - 在当前请求显示（用于 render）
flash.now[:alert] = "登录失败"
render :new
```

### 安全的数据库查询

```ruby
# ❌ 危险！SQL 注入风险
User.where("email = '#{params[:email]'")

# ✅ 安全！Rails 会自动转义
User.find_by(email: params[:email])
User.where(email: params[:email])
```

---

## 常见问题

### Q: 如何让某些页面必须登录才能访问？

```ruby
class PostsController < ApplicationController
  before_action :authenticate_user!, only: [:create, :edit, :destroy]

  def index
    # 所有人可访问
  end

  def create
    # 必须登录才能访问
  end
end
```

### Q: 如何记住登录状态（记住我）？

使用持久 Cookie：

```ruby
# 登录时
if params[:remember_me]
  cookies.signed[:user_id] = { value: user.id, expires: 2.weeks }
end

# ApplicationController
def current_user
  @current_user ||= User.find_by(id: session[:user_id]) ||
                    User.find_by(id: cookies.signed[:user_id])
end
```

### Q: iPhone/iOS Safari 关闭浏览器后需要重新登录，但 Mac 不需要？

这是 **iOS Safari 的隐私保护机制**导致的。

**原因：**
1. Rails 默认的 Session Cookie 是"浏览器会话级别"（关闭即删除）
2. iOS Safari 严格清理会话 Cookie，而 Mac 浏览器有"恢复会话"机制
3. iOS 智能跟踪预防 (ITP) 限制长期 Cookie

**解决方案：**

**方法 1：配置 Session 过期时间（推荐）**

创建 `config/initializers/session_store.rb`：

```ruby
Rails.application.config.session_store :cookie_store,
  key: '_your_app_session',
  expire_after: 2.weeks,  # 关键：设置明确的过期时间
  secure: Rails.env.production?,
  httponly: true,
  same_site: :lax
```

**方法 2：实现"记住我"功能**

让用户自主选择是否保持登录（见上文"记住我"实现）。

**关键区别：**
- 不设置 `expire_after` = 浏览器会话 Cookie（iOS 关闭即删）
- 设置 `expire_after` = 持久 Cookie（iOS 尊重过期时间）

**验证方法：**
1. iPhone 登录并勾选"记住我"
2. 完全关闭 Safari（从应用切换器上滑关闭）
3. 重新打开 Safari 访问网站
4. 应该仍然保持登录状态

### Q: 如何修改密码？

```ruby
class UsersController < ApplicationController
  def update_password
    @user = current_user

    # 验证当前密码
    if @user.authenticate(params[:current_password])
      if @user.update(password: params[:new_password])
        flash[:notice] = "密码已修改"
      else
        flash[:alert] = @user.errors.full_messages.join(", ")
      end
    else
      flash[:alert] = "当前密码错误"
    end
  end
end
```

### Q: 如何在控制台创建测试用户？

```bash
rails console
```

```ruby
User.create!(
  email: "test@example.com",
  password: "password123",
  password_confirmation: "password123"
)
```

---

## 🎉 总结

你已经学会了：
1. ✅ 使用 bcrypt 加密密码
2. ✅ 使用 Session 保持登录状态
3. ✅ 实现登录/登出功能
4. ✅ 在视图中显示登录状态
5. ✅ 保护需要登录的页面

接下来可以学习：
- 邮件验证
- 密码重置
- OAuth（第三方登录）
- 角色权限管理

---

**Happy Coding! 🚀**
