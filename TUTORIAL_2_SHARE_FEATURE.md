# 🌸 教程二：实现带过期时间的分享功能

> 点击"..."菜单里的"分享"，生成一个独一无二的链接，1个月后自动过期

## 最终效果

- 分享链接是唯一的（如：`/share/aB3dEfGhIjKlMnOp`）
- 链接有效期1个月
- 过期后随机显示名言，不显示分享者
- 有效期内显示"来自朋友（昵称）"

---

## 步骤一：创建分享记录表

### 1.1 生成模型

在终端输入：

```bash
rails generate model SharedQuote quote_id:integer user:references token:string expires_at:datetime accessed_count:integer
```

💡 **这些字段是什么意思？**

| 字段名 | 类型 | 用途 |
|--------|------|------|
| quote_id | integer | 分享的是哪句名言 |
| user | references | 谁分享的（关联到用户） |
| token | string | 唯一的随机字符串（链接地址） |
| expires_at | datetime | 什么时候过期 |
| accessed_count | integer | 被打开了多少次 |

### 1.2 修改迁移文件

编辑刚生成的文件 `db/migrate/xxx_create_shared_quotes.rb`：

```ruby
class CreateSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    create_table :shared_quotes do |t|
      t.integer :quote_id, null: false
      t.references :user, null: false, foreign_key: true
      t.string :token, null: false
      t.datetime :expires_at, null: false
      t.integer :accessed_count, default: 0

      t.timestamps
    end

    # 添加索引，加快查询速度
    add_index :shared_quotes, :token, unique: true
    add_index :shared_quotes, :expires_at
  end
end
```

💡 **添加了索引：**
- `token` 唯一索引：确保不会重复，查询更快
- `expires_at` 索引：方便清理过期数据

### 1.3 执行迁移

```bash
rails db:migrate
```

---

## 步骤二：设置模型逻辑

编辑 `app/models/shared_quote.rb`：

```ruby
class SharedQuote < ApplicationRecord
  belongs_to :user

  # 创建记录前自动执行
  before_create :generate_token, :set_expiration

  # 新记录初始化默认值
  after_initialize :set_defaults, if: :new_record?

  # 检查是否过期
  def expired?
    expires_at < Time.current
  end

  # 增加访问次数
  def increment_access!
    increment!(:accessed_count)
  end

  private

  def set_defaults
    self.accessed_count ||= 0
  end

  # 生成唯一的随机令牌
  def generate_token
    self.token = loop do
      random_token = SecureRandom.urlsafe_base64(16)
      break random_token unless self.class.exists?(token: random_token)
    end
  end

  # 设置过期时间为1个月后
  def set_expiration
    self.expires_at = 1.month.from_now
  end
end
```

💡 **这段代码做什么？**

| 方法 | 作用 |
|------|------|
| `generate_token` | 生成16位随机字符串，确保唯一 |
| `set_expiration` | 自动设置1个月后的过期时间 |
| `expired?` | 判断当前时间是否超过过期时间 |
| `increment_access!` | 每次打开链接，访问次数+1 |

---

## 步骤三：添加路由

编辑 `config/routes.rb`：

```ruby
# 分享链接（使用 token）
get "share/:token", to: "home#share", as: :share

# API: 创建分享（返回 JSON）
post "api/create_share", to: "home#create_share"
```

💡 **为什么需要两个路由？**
- `get`：给访问者用，打开分享页面
- `post`：给登录用户用，创建新的分享

---

## 步骤四：实现控制器逻辑

编辑 `app/controllers/home_controller.rb`：

### 4.1 在 `QUOTES` 常量下面添加 `helper_method`

```ruby
class HomeController < ApplicationController
  QUOTES = {
    1 => "花中樱花，人中武士",
    2 => "世事无常，转瞬即逝",
    3 => "静心是一切美的源泉"
  }.freeze

  helper_method :sharer_display_name  # 添加这行
```

### 4.2 重写 `share` 方法

**删除原来的 `share` 方法，改成：**

```ruby
# 分享页面
def share
  # 通过 token 查找分享记录
  @shared_quote = SharedQuote.find_by(token: params[:token])

  if @shared_quote.nil?
    # Token 不存在，显示随机名言
    @quote_id = QUOTES.keys.sample
    @quote = QUOTES[@quote_id]
    @sharer = nil
    @expired = false
    return
  end

  # 增加访问次数
  @shared_quote.increment_access!

  # 检查是否过期
  if @shared_quote.expired?
    # 过期了，随机显示名言，不显示分享者
    @quote_id = QUOTES.keys.sample
    @quote = QUOTES[@quote_id]
    @sharer = nil
    @expired = true
    @expired_at = @shared_quote.expires_at
  else
    # 未过期，显示分享的名言和分享者
    @quote_id = @shared_quote.quote_id
    @quote = QUOTES[@quote_id]
    @sharer = @shared_quote.user
    @expired = false
  end
end
```

💡 **逻辑说明：**
1. 根据 token 查找分享记录
2. 找不到 → 随机显示名言
3. 找到了但过期 → 随机显示名言，标记过期
4. 找到了且有效 → 显示分享的名言和分享者

### 4.3 添加创建分享的 API

在 `private` 上面添加：

```ruby
# API: 创建分享链接
def create_share
  # 需要登录
  unless logged_in?
    render json: { error: "请先登录" }, status: :unauthorized
    return
  end

  quote_id = params[:quote_id].to_i

  # 验证 quote_id 是否有效
  unless QUOTES.key?(quote_id)
    render json: { error: "无效的名言" }, status: :unprocessable_entity
    return
  end

  # 创建分享记录
  shared_quote = SharedQuote.create!(
    quote_id: quote_id,
    user: current_user
  )

  # 返回分享链接
  render json: {
    token: shared_quote.token,
    url: share_url(token: shared_quote.token),
    expires_at: shared_quote.expires_at.strftime("%Y-%m-%d %H:%M")
  }
end
```

💡 **返回什么数据？**
- `token`：随机令牌
- `url`：完整的分享链接
- `expires_at`：过期时间（格式化后的字符串）

### 4.4 添加辅助方法

在 `private` 部分添加：

```ruby
private

# 显示分享者名称
def sharer_display_name
  return "来自朋友的分享" unless @sharer.present?

  display_name = @sharer.nickname.presence || @sharer.email
  "来自朋友（#{display_name}）"
end
```

---

## 步骤五：创建分享页面

创建文件 `app/views/home/share.html.erb`：

```erb
<div class="share-page">
  <div class="share-card">
    <!-- 标签：有效期内显示分享者，过期显示"已过期" -->
    <div class="share-badge <%= 'expired' if @expired %>">
      <span>
        <% if @expired %>
          ⏰ 分享链接已过期
        <% else %>
          💌 <%= sharer_display_name %>
        <% end %>
      </span>
    </div>

    <!-- 名言内容 -->
    <h1 class="share-quote"><%= @quote %></h1>
    <p class="share-subtitle">日本文学名言</p>

    <!-- 过期提示 -->
    <% if @expired %>
      <p class="expired-hint">原分享已过期，为您随机展示一句名言</p>
    <% end %>

    <!-- 按钮 -->
    <div class="share-actions">
      <%= link_to "查看更多精彩内容", root_path, class: "share-btn primary" %>
    </div>
  </div>

  <div class="share-footer">
    <p>由 Peter Cat 生成</p>
  </div>
</div>

<style>
  .share-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #fef9f3 0%, #fff5eb 100%);
  }

  .share-card {
    background: white;
    border-radius: 24px;
    padding: 3rem 2.5rem;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  /* 标签样式 */
  .share-badge {
    display: inline-block;
    background: linear-gradient(135deg, #DC4C3E, #ff6b6b);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 2rem;
  }

  /* 过期状态的标签 */
  .share-badge.expired {
    background: linear-gradient(135deg, #9ca3af, #d1d5db);
  }

  .share-quote {
    font-size: 1.75rem;
    color: #292524;
    line-height: 1.6;
    margin: 0 0 1.5rem;
  }

  .share-subtitle {
    font-size: 0.75rem;
    color: #a8a29e;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }

  .expired-hint {
    font-size: 0.875rem;
    color: #9ca3af;
    margin-bottom: 1.5rem;
    font-style: italic;
  }

  .share-btn {
    display: inline-block;
    padding: 0.875rem 2rem;
    border-radius: 12px;
    background: #DC4C3E;
    color: white;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .share-btn:hover {
    background: #c93f32;
    transform: translateY(-2px);
  }

  .share-footer {
    margin-top: 2rem;
    color: #a8a29e;
    font-size: 0.75rem;
  }
</style>
```

---

## 步骤六：实现前端分享按钮

### 6.1 修改底部菜单控制器

编辑 `app/javascript/controllers/bottom_menu_controller.js`，**替换 `share` 方法**：

```javascript
// 分享功能：调用 API 创建分享链接
async share(e) {
  e.preventDefault()

  // 获取当前名言的 ID
  const quoteCard = document.querySelector('.quote-card[data-quote-id]')
  const quoteId = quoteCard ? quoteCard.dataset.quoteId : '1'

  // 关闭菜单
  this.backdropTarget.classList.remove("is-open")
  this.menuTarget.classList.remove("is-open")
  document.body.style.overflow = ""

  // 检查是否登录
  const userId = document.body.dataset.userId
  if (!userId) {
    this.showToast('请先登录后再分享')
    return
  }

  try {
    // 调用 API 创建分享链接
    const response = await fetch('/api/create_share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ quote_id: quoteId })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建分享链接失败')
    }

    const data = await response.json()

    // 复制到剪贴板
    await navigator.clipboard.writeText(data.url)

    // 显示提示（包含过期时间）
    this.showToast(`链接已复制！有效期至 ${data.expires_at}`)
  } catch (err) {
    console.error('分享失败:', err)
    this.showToast(err.message || '分享失败，请重试')
  }
}
```

💡 **和之前的区别？**
- 调用 `/api/create_share` API
- 发送 `quote_id` 参数
- 复制返回的完整链接（包含随机 token）
- 提示显示过期时间

### 6.2 确保首页有 quote-id 属性

编辑 `app/views/home/index.html.erb`，检查名言卡片：

```erb
<div class="quote-card"
     data-controller="favorite"
     data-favorite-quote-value="<%= @quote %>"
     data-quote-id="<%= @quote_id %>">  <!-- 确保有这行 -->
```

💡 **必须有 `data-quote-id`**，JavaScript 才能知道当前是哪句名言

---

## 步骤七：添加"分享"按钮到菜单

编辑 `app/views/home/index.html.erb`，在底部菜单部分：

```erb
<nav class="bottom-menu-nav">
  <%# 分享按钮 --%>
  <button type="button" class="bottom-menu-item share-btn" data-action="click->bottom-menu#share">
    <span class="bottom-menu-icon">📤</span>
    <span class="bottom-menu-text">分享</span>
  </button>

  <%# 其他菜单项... %>
</nav>
```

添加样式：

```css
.bottom-menu-item.share-btn {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
```

---

## 步骤八：测试功能

### 8.1 正常流程测试

1. **登录账号**
2. **设置昵称**（参考教程一）
3. **点击"..." → "分享"**
   - 提示："链接已复制！有效期至 2025-03-02 15:30"
4. **粘贴链接到新标签页**
   - 应该显示："来自朋友（你的昵称）"
   - 显示分享的那句名言

### 8.2 过期测试

1. **打开 Rails 控制台**：
   ```bash
   rails console
   ```

2. **找到最近的分享记录，修改过期时间**：
   ```ruby
   share = SharedQuote.last
   share.update!(expires_at: 1.day.ago)
   ```

3. **再次打开分享链接**
   - 应该显示："⏰ 分享链接已过期"
   - 显示随机名言
   - 不显示分享者

---

## 数据清理建议

过期的分享记录可以定期清理，在终端运行：

```ruby
# 删除所有过期的分享（保留最近一个月的）
SharedQuote.where("expires_at < ?", 1.month.ago).destroy_all
```

可以设置为每天自动运行的定时任务（使用 `whenever` gem 或服务器 cron）。

---

## 完整文件清单

| 文件 | 修改内容 |
|------|----------|
| `db/migrate/xxx_create_shared_quotes.rb` | 创建分享记录表 |
| `app/models/shared_quote.rb` | 设置自动生成 token 和过期时间 |
| `config/routes.rb` | 添加分享路由和 API |
| `app/controllers/home_controller.rb` | 实现 share 和 create_share 方法 |
| `app/views/home/share.html.erb` | 新建分享展示页面 |
| `app/javascript/controllers/bottom_menu_controller.js` | 修改 share 方法调用 API |
| `app/views/home/index.html.erb` | 添加分享按钮到菜单 |

完成！现在你的应用有了安全、有时效性的分享功能~ 🎉
