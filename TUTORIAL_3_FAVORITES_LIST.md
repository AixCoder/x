# 教程三：底部更多菜单与红心列表查看功能

> 📋 做一个"我的收藏"页面，从底部滑出菜单查看所有收藏的句子

## 一、功能设计

在页面右下角有一个 **"更多"** 按钮（三个点 ...），点击后：

1. 从底部弹出菜单面板（类似手机 App 的底部菜单）
2. 菜单项包括：
   - 📤 分享（生成分享链接）
   - ℹ️ About（关于页面）
   - ❤️ 红心列表（查看所有收藏）

点击"红心列表"进入收藏页面，展示所有收藏的文学名言。

## 二、核心组件

需要三个部分配合：

```
更多按钮（右下角）
     ↓ 点击
底部菜单（弹出面板）
     ↓ 点击"红心列表"
收藏列表页面（展示数据）
```

## 三、逐步实现

### 步骤 1：创建底部菜单控制器

创建文件 `app/javascript/controllers/bottom_menu_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class BottomMenuController extends Controller {
  static targets = ["backdrop", "menu"]

  // 打开菜单
  open() {
    this.backdropTarget.classList.add("is-open")
    // 阻止背景滚动
    document.body.style.overflow = 'hidden'
  }

  // 关闭菜单
  close() {
    this.backdropTarget.classList.remove("is-open")
    // 恢复背景滚动
    document.body.style.overflow = ''
  }

  // 点击菜单项后关闭
  itemClick() {
    this.close()
  }

  // 分享功能
  async share() {
    try {
      // 调用后端 API 创建分享
      const response = await fetch('/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCsrfToken()
        }
      })

      if (response.ok) {
        const data = await response.json()
        // 复制分享链接到剪贴板
        await navigator.clipboard.writeText(data.url)
        alert('分享链接已复制！')
      }
    } catch (error) {
      console.error('分享失败:', error)
    }

    this.close()
  }

  getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
```

### 步骤 2：在页面中添加底部菜单

在首页 `app/views/home/index.html.erb` 底部添加：

```erb
<%# 底部更多菜单 %>
<div data-controller="bottom-menu">
  <%# 更多按钮（右下角固定）%>
  <button type="button" class="more-btn" data-action="click->bottom-menu#open">
    ...
  </button>

  <%# 底部弹出菜单 %>
  <div class="bottom-menu-backdrop"
       data-bottom-menu-target="backdrop"
       data-action="click->bottom-menu#close">

    <%# 菜单面板（从底部滑入）%>
    <div class="bottom-menu-container" data-bottom-menu-target="menu">
      <%# 拖动手柄（提示可以拖动）%>
      <div class="bottom-menu-handle"></div>

      <%# 菜单项列表 %>
      <nav class="bottom-menu-nav">
        <%# 分享按钮 %>
        <button type="button" class="bottom-menu-item" data-action="click->bottom-menu#share">
          <span class="bottom-menu-icon">📤</span>
          <span class="bottom-menu-text">分享</span>
        </button>

        <%# About 链接 %>
        <%= link_to about_path, class: "bottom-menu-item",
              data: { action: "click->bottom-menu#itemClick" } do %>
          <span class="bottom-menu-icon">ℹ️</span>
          <span class="bottom-menu-text">about</span>
        <% end %>

        <%# 红心列表链接 %>
        㲀= link_to favorites_path, class: "bottom-menu-item",
              data: { action: "click->bottom-menu#itemClick" } do %>
          <span class="bottom-menu-icon">❤️</span>
          <span class="bottom-menu-text">红心列表</span>
        <% end %>
      </nav>
    </div>
  </div>
</div>
```

### 步骤 3：添加样式（CSS）

```css
/* 更多按钮（固定在右下角） */
.more-btn {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  z-index: 40;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  color: #DC4C3E;
}

/* 底部菜单遮罩层 */
.bottom-menu-backdrop {
  position: fixed;
  inset: 0;  /* 相当于 top:0; right:0; bottom:0; left:0 */
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);  /* 毛玻璃效果 */
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s;
}

/* 打开状态 */
.bottom-menu-backdrop.is-open {
  opacity: 1;
  visibility: visible;
}

/* 菜单面板（从底部滑入） */
.bottom-menu-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 24px 24px 0 0;  /* 顶部圆角 */
  padding: 1rem 0 2rem;
  transform: translateY(100%);  /* 初始状态：藏在屏幕下方 */
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 101;
  max-width: 480px;
  margin: 0 auto;
}

/* 打开时滑上来 */
.bottom-menu-backdrop.is-open .bottom-menu-container {
  transform: translateY(0);
}

/* 拖动手柄 */
.bottom-menu-handle {
  width: 40px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin: 0 auto 1.5rem;
}

/* 菜单导航 */
.bottom-menu-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1.5rem;
}

/* 单个菜单项 */
.bottom-menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  text-decoration: none;
  color: #374151;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 500;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.bottom-menu-item:hover {
  background: #f9fafb;
  color: #DC4C3E;
  transform: translateX(4px);
}

/* 图标 */
.bottom-menu-icon {
  font-size: 1.25rem;
  width: 32px;
  text-align: center;
}
```

### 步骤 4：创建红心列表页面

**后端控制器**（`app/controllers/home_controller.rb`）：

```ruby
class HomeController < ApplicationController
  # 首页
  def index
    # 随机展示一句名言
    @quote_id = QUOTES.keys.sample
    @quote = QUOTES[@quote_id]
  end

  # 红心列表页面
  def favorites
    # 这个页面主要靠前端从 localStorage 读取数据展示
    # 后端可以做一些额外的数据处理
  end

  # 关于页面
  def about
  end
end
```

**路由**（`config/routes.rb`）：

```ruby
get 'favorites', to: 'home#favorites'
get 'about', to: 'home#about'
```

**页面视图**（`app/views/home/favorites.html.erb`）：

```erb
<%# ============================================
   红心列表页面 - 展示所有收藏的名言
   ============================================
%>

<div class="favorites-page" data-controller="favorites-list">
  <%# 页面标题 %>
  <div class="favorites-header">
    <h1>我的收藏 ❤️</h1>
    <p class="favorites-subtitle">
      共收藏了 <span data-favorites-list-target="count">0</span> 条名言
    </p>
  </div>

  <%# 收藏列表容器 %>
  <div class="favorites-container" data-favorites-list-target="list">
    <%# 空状态提示 %>
    <div class="favorites-empty" data-favorites-list-target="empty">
      <div class="empty-icon">🤍</div>
      <p>还没有收藏任何名言</p>
      <p class="empty-hint">去首页发现喜欢的句子吧～</p>
      <%= link_to "去首页", root_path, class: "empty-link" %>
    </div>

    <%# 收藏列表项（由 JS 动态生成）%>
  </div>

  <%# 返回按钮 %>
  <%= link_to root_path, class: "back-link" do %>
    ← 返回首页
  <% end %>
</div>

<style>
  .favorites-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .favorites-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .favorites-header h1 {
    font-size: 1.75rem;
    color: #292524;
    margin-bottom: 0.5rem;
  }

  .favorites-subtitle {
    color: #a8a29e;
    font-size: 0.875rem;
  }

  .favorites-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  /* 单个收藏卡片 */
  .favorite-item {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #f0f0f0;
    position: relative;
  }

  .favorite-quote {
    font-size: 1.125rem;
    line-height: 1.6;
    color: #292524;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .favorite-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .favorite-date {
    font-size: 0.75rem;
    color: #a8a29e;
  }

  .favorite-delete {
    background: none;
    border: none;
    color: #DC4C3E;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
  }

  /* 空状态 */
  .favorites-empty {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .favorites-empty p {
    color: #78716c;
    margin-bottom: 0.5rem;
  }

  .empty-hint {
    font-size: 0.875rem;
    color: #a8a29e;
  }

  .empty-link {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #DC4C3E;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 0.875rem;
  }

  /* 返回链接 */
  .back-link {
    display: inline-flex;
    align-items: center;
    color: #78716c;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #DC4C3E;
  }
</style>
```

### 步骤 5：创建收藏列表控制器

创建文件 `app/javascript/controllers/favorites_list_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class FavoritesListController extends Controller {
  static targets = ["list", "empty", "count"]

  connect() {
    this.loadFavorites()
  }

  // 从 localStorage 加载收藏
  loadFavorites() {
    const favorites = this.getFavorites()

    // 更新计数
    this.countTarget.textContent = favorites.length

    // 如果没有收藏，显示空状态
    if (favorites.length === 0) {
      this.emptyTarget.style.display = 'block'
      return
    }

    // 隐藏空状态
    this.emptyTarget.style.display = 'none'

    // 渲染收藏列表
    favorites.forEach((quote, index) => {
      const item = this.createFavoriteItem(quote, index)
      this.listTarget.appendChild(item)
    })
  }

  // 创建单个收藏项的 HTML
  createFavoriteItem(quote, index) {
    const div = document.createElement('div')
    div.className = 'favorite-item'
    div.innerHTML = `
      <div class="favorite-quote">"${this.escapeHtml(quote)}"</div>
      <div class="favorite-actions">
        <span class="favorite-date">#${index + 1}</span>
        <button type="button" class="favorite-delete" data-action="click->favorites-list#delete">
          删除
        </button>
      </div>
    `
    // 把名言内容存到元素上，方便删除时用
    div.dataset.quote = quote
    return div
  }

  // 删除收藏
  delete(event) {
    const item = event.target.closest('.favorite-item')
    const quote = item.dataset.quote

    if (confirm('确定要删除这条收藏吗？')) {
      // 从 localStorage 删除
      this.removeFavorite(quote)

      // 从页面移除
      item.remove()

      // 更新计数
      const favorites = this.getFavorites()
      this.countTarget.textContent = favorites.length

      // 如果没有了，显示空状态
      if (favorites.length === 0) {
        this.emptyTarget.style.display = 'block'
      }
    }
  }

  // 获取所有收藏
  getFavorites() {
    const stored = localStorage.getItem('favorite_quotes')
    if (!stored) return []
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('解析收藏数据失败:', e)
      return []
    }
  }

  // 删除单个收藏
  removeFavorite(quote) {
    const favorites = this.getFavorites()
    const filtered = favorites.filter(q => q !== quote)
    localStorage.setItem('favorite_quotes', JSON.stringify(filtered))
  }

  // 防止 XSS 攻击，转义 HTML 特殊字符
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
```

## 四、知识点讲解

### 1. 底部滑出菜单的实现原理

```css
/* 初始状态：藏在屏幕下方 */
.bottom-menu-container {
  transform: translateY(100%);
}

/* 打开状态：回到原位 */
.bottom-menu-backdrop.is-open .bottom-menu-container {
  transform: translateY(0);
}
```

使用 `transform` 而不是改变 `top`/`bottom`，因为 transform 性能更好，有硬件加速。

### 2. 为什么用 `cubic-bezier`？

```css
transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
```

这是 Material Design 的缓动曲线，效果：
- 开始快（迅速响应用户点击）
- 结束慢（优雅地停下来）

### 3. 防止背景滚动

```javascript
open() {
  document.body.style.overflow = 'hidden'  // 禁止滚动
}

close() {
  document.body.style.overflow = ''  // 恢复滚动
}
```

菜单打开时，后面的页面不应该跟着滚动。

### 4. 动态生成列表项

```javascript
favorites.forEach((quote, index) => {
  const item = this.createFavoriteItem(quote, index)
  this.listTarget.appendChild(item)
})
```

为什么不直接写在 HTML 里？因为数据存在 localStorage，页面加载时才需要读取并渲染。

## 五、使用流程

```
1. 在首页看到喜欢的名言
        ↓
2. 点击红心收藏（存到 localStorage）
        ↓
3. 点击右下角"更多"按钮
        ↓
4. 底部弹出菜单，选择"红心列表"
        ↓
5. 进入收藏页面，看到所有收藏的名言
        ↓
6. 可以删除不需要的收藏
```

## 六、扩展建议

如果想让功能更完善，可以考虑：

1. **添加收藏时间**：保存时记录时间戳，列表按时间排序
2. **搜索收藏**：收藏的句子多了，可以搜索关键词
3. **分类标签**：给名言打标签（励志、爱情、哲学等）
4. **导出功能**：导出为文本文件或图片

---

恭喜！三篇教程都完成了 🎉

现在你拥有了一个完整的系统：
- 漂亮的登录/注册弹窗
- 本地收藏功能
- 底部菜单导航
- 收藏列表查看
