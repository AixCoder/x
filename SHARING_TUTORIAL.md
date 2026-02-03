# 名言分享功能开发完整教程

## 目录
1. [功能概述](#功能概述)
2. [数据库设计](#数据库设计)
3. [后端 API 开发](#后端-api-开发)
4. [前端交互实现](#前端交互实现)
5. [跨平台复制方案详解](#跨平台复制方案详解)
6. [遇到的问题与解决方案](#遇到的问题与解决方案)
7. [部署注意事项](#部署注意事项)

---

## 功能概述

### 核心功能
名言分享功能允许用户将当前显示的名言生成一个分享链接，链接有效期为30天。功能特点：

- **支持匿名分享**：未登录用户也能创建分享链接
- **跨平台兼容**：支持桌面浏览器、iOS Safari、Android Chrome
- **访问统计**：记录分享链接被访问的次数
- **过期机制**：30天后自动过期，显示随机名言

### 技术栈
- **后端**：Ruby on Rails 7.2 + SQLite
- **前端**：Stimulus.js + Turbo
- **部署**：支持局域网访问和 HTTPS 生产环境

---

## 数据库设计

### 迁移文件

```ruby
# db/migrate/xxx_create_shared_quotes.rb
class CreateSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    create_table :shared_quotes do |t|
      t.integer :quote_id, null: false    # 名言ID
      t.integer :user_id                  # 用户ID（可选，支持匿名）
      t.string :token, null: false        # 唯一分享令牌
      t.datetime :expires_at, null: false # 过期时间
      t.integer :accessed_count, default: 0  # 访问次数

      t.timestamps
    end

    add_index :shared_quotes, :token, unique: true
    add_index :shared_quotes, :user_id
  end
end

# 支持匿名分享的关键迁移
class ChangeUserIdToNullableInSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    change_column_null :shared_quotes, :user_id, true
  end
end
```

### 模型详解

```ruby
# app/models/shared_quote.rb
class SharedQuote < ApplicationRecord
  # optional: true 是支持匿名分享的关键
  belongs_to :user, optional: true

  # 创建前自动生成令牌和过期时间
  before_create :generate_token, :set_expiration

  # 初始化时设置默认值
  after_initialize :set_defaults, if: :new_record?

  # 检查是否过期
  def expired?
    expires_at < Time.current
  end

  # 原子操作增加访问次数
  def increment_access!
    increment!(:accessed_count)
  end

  private

  def set_defaults
    self.accessed_count ||= 0
  end

  # 生成32字符的URL安全随机令牌
  def generate_token
    self.token = loop do
      random_token = SecureRandom.urlsafe_base64(16)
      break random_token unless self.class.exists?(token: random_token)
    end
  end

  def set_expiration
    self.expires_at = 1.month.from_now
  end
end
```

---

## 后端 API 开发

### 路由配置

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # 分享页面（使用 token）
  get "share/:token", to: "home#share", as: :share

  # API: 创建分享
  post "api/create_share", to: "home#create_share"
end
```

### 控制器实现

```ruby
# app/controllers/home_controller.rb
class HomeController < ApplicationController
  QUOTES = {
    1 => "花中樱花，人中武士",
    2 => "世事无常，转瞬即逝",
    3 => "静心是一切美的源泉"
  }.freeze

  # ============================================
  # API: 创建分享链接
  # ============================================
  def create_share
    quote_id = params[:quote_id].to_i

    unless QUOTES.key?(quote_id)
      render json: { error: "无效的名言" }, status: :unprocessable_entity
      return
    end

    # 关键：支持匿名分享，user 可为 nil
    shared_quote = SharedQuote.create!(
      quote_id: quote_id,
      user: logged_in? ? current_user : nil
    )

    render json: {
      token: shared_quote.token,
      url: share_url(token: shared_quote.token),
      expires_at: shared_quote.expires_at.strftime("%Y-%m-%d %H:%M")
    }
  rescue StandardError => e
    Rails.logger.error "创建分享链接失败: #{e.message}"
    render json: { error: "创建分享链接失败" }, status: :internal_server_error
  end

  # ============================================
  # 分享页面展示
  # ============================================
  def share
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

    if @shared_quote.expired?
      @quote_id = QUOTES.keys.sample
      @quote = QUOTES[@quote_id]
      @sharer = nil
      @expired = true
    else
      @quote_id = @shared_quote.quote_id
      @quote = QUOTES[@quote_id]
      @sharer = @shared_quote.user
      @expired = false
    end
  end
end
```

### CSRF 错误处理

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception, prepend: true

  # 关键：确保 API 请求返回 JSON 格式的错误
  rescue_from ActionController::InvalidAuthenticityToken do |exception|
    respond_to do |format|
      format.json {
        render json: { error: "安全验证失败" }, status: :unprocessable_entity
      }
      format.html { redirect_to root_path, alert: "安全验证失败" }
    end
  end
end
```

---

## 前端交互实现

### Stimulus 控制器架构

```javascript
// app/javascript/controllers/bottom_menu_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["backdrop", "menu"]

  // ============================================
  // 分享功能主方法
  // ============================================
  async share(e) {
    e.preventDefault()

    // 1. 获取当前名言ID
    const quoteCard = document.querySelector('.quote-card[data-quote-id]')
    const quoteId = quoteCard ? quoteCard.dataset.quoteId : '1'

    // 2. 关闭菜单
    this.backdropTarget.classList.remove("is-open")
    this.menuTarget.classList.remove("is-open")

    try {
      // 3. 获取 CSRF Token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || ''

      // 4. 调用后端 API
      const response = await fetch('/api/create_share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',  // 关键：明确要求 JSON 响应
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ quote_id: quoteId })
      })

      // 5. 防御性检查
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回格式错误')
      }

      const data = await response.json()

      // 6. 尝试复制（三层降级策略）
      try {
        await this.copyToClipboard(data.url)
        this.showToast(`链接已复制！有效期至 ${data.expires_at}`)
      } catch (copyErr) {
        this.showShareDialog(data.url, data.expires_at)
      }
    } catch (err) {
      this.showToast(err.message || '分享失败')
    }
  }
}
```

---

## 跨平台复制方案详解

### 方案对比表

| 平台 | 首选方案 | 降级方案 | 特殊要求 |
|------|---------|---------|---------|
| Chrome/Edge (桌面) | Clipboard API | execCommand | HTTPS 或 localhost |
| Safari (桌面) | Clipboard API | execCommand | 需要用户交互触发 |
| iOS Safari 16+ | Clipboard API | 全屏 textarea | 元素必须在视口内 |
| Android Chrome | Clipboard API | execCommand | 无特殊要求 |
| IE 11 | execCommand | 手动复制对话框 | 无 |

### 三层降级策略实现

```javascript
/**
 * 主入口：根据平台选择最佳方案
 */
async copyToClipboard(text) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  // 第一层：iOS 专用方案
  if (isIOS) {
    try {
      return await this.copyToClipboardIOS(text)
    } catch (err) {
      console.warn('iOS 方案失败:', err)
    }
  }

  // 第二层：现代 Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      return await navigator.clipboard.writeText(text)
    } catch (err) {
      console.warn('Clipboard API 失败:', err)
    }
  }

  // 第三层：传统 execCommand
  return this.copyToClipboardFallback(text)
}

/**
 * iOS 专用方案
 *
 * 关键要点：
 * 1. 使用全屏 textarea 确保元素在视口内
 * 2. 使用 requestAnimationFrame 确保渲染完成
 * 3. 使用 setSelectionRange(0, 999999) 兼容 iOS
 */
async copyToClipboardIOS(text) {
  // iOS 16+ 先尝试 Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (err) {
      // 降级到 execCommand
    }
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.readOnly = true
    textarea.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      z-index: -1;
      font-size: 16px;  /* 防止 iOS 缩放 */
    `
    document.body.appendChild(textarea)

    // 关键：requestAnimationFrame 确保渲染完成
    requestAnimationFrame(() => {
      try {
        textarea.focus()
        textarea.select()
        textarea.setSelectionRange(0, 999999)

        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        success ? resolve() : reject(new Error('iOS 复制失败'))
      } catch (err) {
        document.body.removeChild(textarea)
        reject(err)
      }
    })
  })
}

/**
 * 传统降级方案
 */
copyToClipboardFallback(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 1px;
      height: 1px;
      opacity: 0;
    `
    document.body.appendChild(textarea)

    try {
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, 999999)

      const success = document.execCommand('copy')
      document.body.removeChild(textarea)

      success ? resolve() : reject(new Error('复制失败'))
    } catch (err) {
      document.body.removeChild(textarea)
      reject(err)
    }
  })
}
```

---

## 遇到的问题与解决方案

### 问题1：iOS 复制完全失败

**症状**：iOS 16 上所有复制方案都失败

**原因**：
1. iOS Safari 要求复制元素必须在视口内且"可见"（opacity: 0 可以，display: none 不行）
2. iOS 16 对 navigator.clipboard 支持有限
3. 需要在 requestAnimationFrame 中执行确保渲染完成

**解决方案**：
```javascript
// 创建全屏 textarea
const textarea = document.createElement('textarea')
textarea.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  z-index: -1;
`

// 使用 requestAnimationFrame
requestAnimationFrame(() => {
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
})
```

### 问题2：Mac 浏览器 CSRF 错误

**症状**：`SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**原因**：CSRF 验证失败时 Rails 返回 HTML 错误页面，前端尝试解析 JSON 失败

**解决方案**：
1. 后端添加错误处理：
```ruby
rescue_from ActionController::InvalidAuthenticityToken do |exception|
  format.json { render json: { error: "安全验证失败" }, status: :unprocessable_entity }
end
```

2. 前端添加 Accept 头和防御性检查：
```javascript
fetch('/api/create_share', {
  headers: {
    'Accept': 'application/json',  // 明确要求 JSON
    'X-CSRF-Token': csrfToken
  }
})

// 检查响应类型
const contentType = response.headers.get('content-type')
if (!contentType || !contentType.includes('application/json')) {
  throw new Error('服务器返回格式错误')
}
```

### 问题3：数据库约束阻止匿名分享

**症状**：`SQLite3::ConstraintException: NOT NULL constraint failed: shared_quotes.user_id`

**原因**：数据库层面不允许 user_id 为 NULL

**解决方案**：
```ruby
# 迁移文件
class ChangeUserIdToNullableInSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    change_column_null :shared_quotes, :user_id, true
  end
end

# 模型文件
belongs_to :user, optional: true  # 关键：optional: true
```

### 问题4：Clipboard API 未定义

**症状**：`TypeError: undefined is not an object (evaluating 'navigator.clipboard.writeText')`

**原因**：某些浏览器或旧版本不支持 navigator.clipboard

**解决方案**：提供多层降级策略（详见上节）

---

## 部署注意事项

### 开发环境
```bash
# 启动开发服务器
bin/rails server -b 0.0.0.0

# 访问地址
http://localhost:3000
http://127.0.0.1:3000
```

### 生产环境

#### 1. HTTPS 要求
- Clipboard API 仅在安全上下文（HTTPS 或 localhost）中可用
- 生产环境必须配置 SSL 证书

#### 2. 数据库迁移
```bash
RAILS_ENV=production bin/rails db:migrate
```

#### 3. 资产预编译
```bash
RAILS_ENV=production bin/rails assets:precompile
```

#### 4. 会话配置
```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :cookie_store,
  key: '_your_app_session',
  secure: Rails.env.production?,  # HTTPS only in production
  same_site: :lax
```

---

## 测试清单

### 功能测试
- [ ] 已登录用户能创建分享链接
- [ ] 未登录用户能创建匿名分享链接
- [ ] 分享链接能正确打开并显示名言
- [ ] 过期链接显示随机名言和过期提示

### 跨平台测试
- [ ] Chrome/Edge (Windows/macOS)
- [ ] Safari (macOS)
- [ ] iOS Safari 16+
- [ ] Android Chrome
- [ ] 微信内置浏览器

### 边界情况
- [ ] 网络断开时的错误提示
- [ ] CSRF Token 过期后的处理
- [ ] 复制失败时的对话框显示

---

## 总结

本教程详细讲解了名言分享功能的完整开发过程，重点解决了跨平台复制这一前端难题。核心经验：

1. **渐进增强**：先实现基本功能，再逐步优化跨平台兼容性
2. **防御性编程**：每个环节都考虑失败情况和降级方案
3. **详尽的日志**：记录每个错误，便于排查问题
4. **充分的测试**：在不同设备和浏览器上全面测试

完整的代码和详细注释已在前面的章节中提供，开发者可以参考实现类似的分享功能。
