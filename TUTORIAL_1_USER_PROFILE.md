# 🌸 教程一：实现用户昵称功能

> 让登录后的用户可以设置昵称，点击用户名就能编辑资料

## 最终效果

- 登录后显示昵称（如果没有设置则显示邮箱）
- 点击用户名跳转到编辑页面
- 可以修改昵称和密码

---

## 步骤一：给数据库添加昵称字段

### 1.1 创建迁移文件

在终端输入：

```bash
rails generate migration AddNicknameToUsers nickname:string
```

💡 **这是什么意思？**
- 告诉 Rails：我要给 `users` 表添加一个 `nickname` 字段
- 类型是 `string`（字符串，适合存储短文本）

### 1.2 执行迁移

```bash
rails db:migrate
```

💡 **这是什么意思？**
- 把刚才的改动真正应用到数据库里
- 现在数据库可以存储用户的昵称了

---

## 步骤二：允许用户编辑资料

### 2.1 添加路由

编辑 `config/routes.rb`，在 `# 用户注册路由` 部分添加：

```ruby
# 用户资料编辑
get  'profile', to: 'users#edit',   as: :profile
patch 'profile', to: 'users#update'
```

💡 **这两行是什么意思？**
- `get 'profile'`：访问 `/profile` 显示编辑页面
- `patch 'profile'`：提交表单时更新资料

### 2.2 修改用户控制器

编辑 `app/controllers/users_controller.rb`：

**1. 在顶部添加过滤器：**

```ruby
before_action :require_user, only: [:edit, :update]
before_action :set_current_user, only: [:edit, :update]
```

💡 **这是什么意思？**
- 只有登录用户才能编辑资料
- 自动设置当前用户

**2. 在 `private` 上面添加两个方法：**

```ruby
# GET /profile
# 显示编辑资料页面
def edit
end

# PATCH /profile
# 更新用户资料
def update
  # 如果密码为空，不更新密码
  if user_params[:password].blank?
    update_params = user_params.except(:password, :password_confirmation)
  else
    update_params = user_params
  end

  if @user.update(update_params)
    flash[:notice] = "资料更新成功！"
    redirect_to root_path
  else
    flash.now[:alert] = @user.errors.full_messages.join("，")
    render :edit, status: :unprocessable_entity
  end
end
```

💡 **这段代码做什么？**
- `edit`：显示编辑表单（什么都不做，因为 `@user` 已经被 `set_current_user` 设置好了）
- `update`：保存用户的修改
  - 如果密码留空，就不改密码
  - 如果填了密码，就更新密码

**3. 在 `private` 部分添加：**

```ruby
def set_current_user
  @user = current_user
end

# 确保用户已登录
def require_user
  unless logged_in?
    flash[:alert] = "请先登录"
    redirect_to root_path
  end
end
```

**4. 修改 `user_params` 允许昵称：**

```ruby
def user_params
  params.require(:user).permit(:email, :password, :password_confirmation, :nickname)
end
```

💡 **添加了 `:nickname`**，这样表单提交的昵称才能被保存

---

## 步骤三：创建编辑页面

创建文件 `app/views/users/edit.html.erb`，复制以下内容：

```erb
<div class="profile-container">
  <div class="profile-card">
    <h1 class="profile-title">编辑资料</h1>

    <%= form_with model: @user, url: profile_path, local: true, class: "profile-form" do |f| %>

      <% if @user.errors.any? %>
        <div class="error-messages">
          <% @user.errors.full_messages.each do |msg| %>
            <p><%= msg %></p>
          <% end %>
        </div>
      <% end %>

      <!-- 邮箱（只读） -->
      <div class="form-group">
        <%= f.label :email, "邮箱", class: "form-label" %>
        <%= f.email_field :email, class: "form-input", disabled: true %>
        <span class="form-hint">邮箱不可修改</span>
      </div>

      <!-- 昵称 -->
      <div class="form-group">
        <%= f.label :nickname, "昵称", class: "form-label" %>
        <%= f.text_field :nickname, class: "form-input", placeholder: "给自己起个昵称吧", maxlength: 20 %>
        <span class="form-hint">分享卡片时会显示你的昵称</span>
      </div>

      <div class="form-divider">
        <span>修改密码（留空表示不修改）</span>
      </div>

      <!-- 新密码 -->
      <div class="form-group">
        <%= f.label :password, "新密码", class: "form-label" %>
        <%= f.password_field :password, class: "form-input", placeholder: "请输入新密码" %>
      </div>

      <!-- 确认密码 -->
      <div class="form-group">
        <%= f.label :password_confirmation, "确认新密码", class: "form-label" %>
        <%= f.password_field :password_confirmation, class: "form-input", placeholder: "再次输入新密码" %>
      </div>

      <div class="form-actions">
        <%= link_to "取消", root_path, class: "btn btn-secondary" %>
        <%= f.submit "保存修改", class: "btn btn-primary" %>
      </div>
    <% end %>
  </div>
</div>

<style>
  .profile-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #fef9f3 0%, #fff5eb 100%);
  }

  .profile-card {
    background: white;
    border-radius: 24px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  }

  .profile-title {
    font-size: 1.75rem;
    color: #292524;
    text-align: center;
    margin-bottom: 2rem;
    font-weight: 600;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input {
    padding: 0.75rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #DC4C3E;
    box-shadow: 0 0 0 3px rgba(220, 76, 62, 0.1);
  }

  .form-input:disabled {
    background: #f3f4f6;
    color: #9ca3af;
  }

  .form-hint {
    font-size: 0.75rem;
    color: #a8a29e;
  }

  .form-divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: #a8a29e;
    font-size: 0.75rem;
  }

  .form-divider::before,
  .form-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  .form-divider span {
    padding: 0 1rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .btn {
    flex: 1;
    padding: 0.875rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: #DC4C3E;
    color: white;
  }

  .btn-primary:hover {
    background: #c93f32;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #6b7280;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .error-messages {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .error-messages p {
    color: #DC4C3E;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
```

💡 **页面结构说明：**
- 邮箱：灰色不可修改
- 昵称：可以输入，最多20字
- 密码：留空表示不改
- 两个按钮：取消和保存

---

## 步骤四：首页显示昵称并支持点击

### 4.1 修改导航栏

编辑 `app/views/home/index.html.erb`，找到 `user-info` 部分：

**原来的代码：**
```erb
<div class="user-info">
  <span class="user-email"><%= current_user.email %></span>
  <%= button_to "登出", logout_path, method: :delete, class: "nav-button logout-button" %>
</div>
```

**改成：**
```erb
<div class="user-info">
  <%= link_to profile_path, class: "user-profile-link" do %>
    <span class="user-nickname"><%= current_user.nickname.presence || current_user.email %></span>
  <% end %>
  <%= button_to "登出", logout_path, method: :delete, class: "nav-button logout-button" %>
</div>
```

💡 **改动了什么？**
- 把 `<span>` 改成 `<%= link_to %>`，让它变成可点击的链接
- `current_user.nickname.presence || current_user.email`：
  - 如果有昵称就显示昵称
  - 没有昵称就显示邮箱

### 4.2 添加样式

在 `<style>` 部分添加：

```css
.user-profile-link {
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.user-profile-link:hover {
  background: #f3f4f6;
}

.user-nickname {
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;
}
```

---

## 步骤五：测试功能

1. **登录账号**
2. **点击右上角的用户名/邮箱**
   - 应该跳转到 `/profile` 页面
3. **设置昵称**
   - 在"昵称"输入框填写你的名字
   - 点击"保存修改"
4. **返回首页**
   - 右上角应该显示你的昵称了
5. **再次点击昵称**
   - 可以修改或清空（清空后显示邮箱）

---

## 常见问题

**Q: 昵称保存失败？**
- 检查 `user_params` 里是否有 `:nickname`
- 检查数据库迁移是否执行了

**Q: 点击用户名没反应？**
- 检查路由是否配置正确
- 检查链接地址是否正确

**Q: 样式错乱？**
- 确保 CSS 放在 `<style>` 标签内
- 检查是否有语法错误

---

## 完整文件清单

| 文件 | 修改内容 |
|------|----------|
| `db/migrate/xxx_add_nickname_to_users.rb` | 添加昵称字段 |
| `config/routes.rb` | 添加 profile 路由 |
| `app/controllers/users_controller.rb` | 添加 edit/update 方法 |
| `app/views/users/edit.html.erb` | 新建编辑页面 |
| `app/views/home/index.html.erb` | 修改导航栏，添加样式 |

完成！现在用户可以有自己可爱的昵称了~ 🎉
