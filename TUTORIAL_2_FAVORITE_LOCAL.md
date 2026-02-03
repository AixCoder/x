# 教程二：红心本地收藏功能实现教程

> 💝 不用登录也能收藏喜欢的句子，数据存在浏览器里，简单实用

## 一、功能介绍

在这个日本文学名言展示页面，每刷新会显示一句新名言。看到喜欢的句子，点击红心 🤍 就能收藏：

- **点击前**：显示空心红心 🤍（未收藏）
- **点击后**：变成实心红心 ❤️（已收藏）
- **再点击**：取消收藏，变回空心

## 二、为什么选择 localStorage？

### localStorage 是什么？

想象它是浏览器的"记事本"，可以存一些文字信息：
- ✅ 永久保存（除非你主动删除）
- ✅ 不用联网也能用
- ✅ 操作简单，就像操作 JavaScript 对象
- ❌ 只能当前浏览器使用（换电脑/换浏览器就没了）
- ❌ 大概能存 5MB 数据

### 适合场景

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **localStorage** | 简单、不用后端 | 不能跨设备、换浏览器丢失 | 快速体验、个人临时收藏 |
| 数据库存储 | 永久、跨设备 | 需要登录、后端开发 | 正式产品、用户系统 |

对于这个小项目，localStorage 是最轻量的方案。

## 三、核心原理

```
用户点击红心
     ↓
检查是否已收藏（查 localStorage）
     ↓
是 → 删除这条收藏
否 → 添加到收藏列表
     ↓
更新按钮显示（🤍 ↔ ❤️）
```

## 四、代码实现

### 步骤 1：创建 Stimulus 控制器

创建文件 `app/javascript/controllers/favorite_controller.js`：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class FavoriteController extends Controller {
  // 定义可以操作的 HTML 元素
  static targets = ["button"]

  // 从 HTML 接收数据（名言内容）
  static values = { quote: String }

  // ========== 初始化 ==========

  connect() {
    // 页面加载时，根据 localStorage 更新按钮状态
    this.updateButtonState()

    // 标记：是否有待执行的收藏（用于登录后自动收藏）
    this.pendingFavorite = false
  }

  // ========== 点击处理 ==========

  toggle() {
    // 情况 1：未登录 → 打开登录弹窗
    if (!this.isLoggedIn()) {
      this.pendingFavorite = true  // 标记：登录后要自动收藏
      this.openAuthModal()
      return
    }

    // 情况 2：已登录 → 切换收藏状态
    if (this.isFavorited()) {
      this.removeFavorite()
      console.log("取消收藏:", this.quoteValue)
    } else {
      this.saveFavorite()
      console.log("已收藏:", this.quoteValue)
    }

    // 更新按钮外观
    this.updateButtonState()
  }

  // ========== 登录检查 ==========

  isLoggedIn() {
    // 方法 1：检查页面上的标记
    if (document.body.dataset.userLoggedIn === 'true') return true

    // 方法 2：检查是否有登出按钮
    if (document.querySelector('form[action="/logout"]')) return true

    // 方法 3：检查 localStorage（调试用）
    if (localStorage.getItem('user_logged_in') === 'true') return true

    return false
  }

  // ========== 打开登录弹窗 ==========

  openAuthModal() {
    // 获取 auth-modal 控制器
    const authModalElement = document.querySelector('[data-controller="auth-modal"]')

    if (authModalElement && window.Stimulus) {
      const authModal = window.Stimulus.getControllerForElementAndIdentifier(
        authModalElement, 'auth-modal'
      )

      if (authModal) {
        authModal.open()  // 打开弹窗
        this.bindLoginSuccessEvent()  // 监听登录成功
      }
    }
  }

  // ========== 监听登录成功 ==========

  bindLoginSuccessEvent() {
    // 避免重复绑定
    if (this._loginSuccessBound) return
    this._loginSuccessBound = true

    // 监听登录成功事件（由 auth-modal 控制器派发）
    document.addEventListener('auth:login:success', () => {
      if (this.pendingFavorite) {
        this.pendingFavorite = false
        // 延迟执行，确保页面更新完成
        setTimeout(() => {
          this.saveFavorite()
          this.updateButtonState()
        }, 100)
      }
    })
  }

  // ========== 收藏操作（核心）==========

  // 检查是否已收藏
  isFavorited() {
    const favorites = this.getFavorites()
    return favorites.includes(this.quoteValue)
  }

  // 保存收藏
  saveFavorite() {
    const favorites = this.getFavorites()

    // 避免重复添加
    if (!favorites.includes(this.quoteValue)) {
      favorites.push(this.quoteValue)

      // 保存到 localStorage（必须是字符串）
      localStorage.setItem('favorite_quotes', JSON.stringify(favorites))
    }
  }

  // 取消收藏
  removeFavorite() {
    const favorites = this.getFavorites()

    // 过滤掉当前名言
    const filtered = favorites.filter(quote => quote !== this.quoteValue)

    localStorage.setItem('favorite_quotes', JSON.stringify(filtered))
  }

  // 获取所有收藏
  getFavorites() {
    const stored = localStorage.getItem('favorite_quotes')

    // 如果没有数据，返回空数组
    if (!stored) return []

    // 解析 JSON 字符串为数组
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('解析收藏数据失败:', e)
      return []
    }
  }

  // ========== 更新按钮外观 ==========

  updateButtonState() {
    const icon = this.buttonTarget.querySelector('.heart-icon')

    if (this.isFavorited()) {
      // 已收藏：实心红心 + 添加样式类
      this.buttonTarget.classList.add('favorited')
      icon.textContent = '❤️'
      this.buttonTarget.setAttribute('aria-label', '取消收藏')
    } else {
      // 未收藏：空心红心
      this.buttonTarget.classList.remove('favorited')
      icon.textContent = '🤍'
      this.buttonTarget.setAttribute('aria-label', '收藏')
    }
  }
}
```

### 步骤 2：在页面中使用

在首页 `app/views/home/index.html.erb` 中：

```erb
<%# 名言卡片，由 favorite 控制器管理 %>
<div class="quote-card"
     data-controller="favorite"
     data-favorite-quote-value="<%= @quote %>">

  <%# 红心按钮 %>
  <button type="button"
          class="heart-button"
          data-favorite-target="button"
          data-action="click->favorite#toggle"
          aria-label="收藏这条名言">
    <span class="heart-icon">🤍</span>
  </button>

  <%# 名言内容 %>
  <h1 class="quote-text"><%= @quote %></h1>
  <p class="quote-subtitle">日本文学名言</p>
</div>
```

### 步骤 3：添加样式

让红心按钮更美观：

```css
/* 红心按钮基础样式 */
.heart-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s ease;
  padding: 0.5rem;
}

/* 鼠标悬停效果 */
.heart-button:hover {
  transform: scale(1.2);
}

/* 点击时的动画 */
.heart-button:active {
  transform: scale(0.9);
}

/* 已收藏状态 */
.heart-button.favorited {
  /* 可以添加特殊样式，比如发光效果 */
  filter: drop-shadow(0 0 4px rgba(220, 76, 62, 0.5));
}

/* 红心图标 */
.heart-icon {
  display: inline-block;
  transition: all 0.2s ease;
}
```

## 五、localStorage 操作详解

### 基础用法

```javascript
// 存数据（必须是字符串）
localStorage.setItem('key', 'value')

// 取数据
const value = localStorage.getItem('key')

// 删除某条
localStorage.removeItem('key')

// 清空所有
localStorage.clear()
```

### 存数组/对象

因为只能存字符串，需要 JSON 转换：

```javascript
// 存数组
const favorites = ["名言1", "名言2", "名言3"]
localStorage.setItem('favorite_quotes', JSON.stringify(favorites))

// 取数组
const stored = localStorage.getItem('favorite_quotes')
const favorites = JSON.parse(stored)  // 转回数组

// 存对象
const user = { name: "小明", age: 25 }
localStorage.setItem('user', JSON.stringify(user))

// 取对象
const userStr = localStorage.getItem('user')
const userObj = JSON.parse(userStr)
```

### 在浏览器中查看

1. 按 `F12` 打开开发者工具
2. 切换到 `Application`（应用）标签
3. 左侧找到 `Local Storage`
4. 点击你的网站域名，就能看到存储的数据

## 六、登录后自动收藏的逻辑

这是个小技巧：用户未登录时点击收藏，不应该只是提示登录，而是：

1. 打开登录弹窗
2. 用户完成登录
3. **自动完成刚才的收藏操作**

代码实现：

```javascript
toggle() {
  if (!this.isLoggedIn()) {
    this.pendingFavorite = true  // 标记：有未完成的收藏
    this.openAuthModal()
    return
  }
  // ...正常收藏逻辑
}

// 监听登录成功事件
bindLoginSuccessEvent() {
  document.addEventListener('auth:login:success', () => {
    if (this.pendingFavorite) {
      this.pendingFavorite = false  // 清除标记
      this.saveFavorite()           // 执行收藏
      this.updateButtonState()      // 更新按钮
    }
  })
}
```

这样用户体验就很流畅：点击红心 → 登录 → 自动收藏成功。

## 七、常见问题

**Q: 收藏刷新了还在吗？**
A: 在，localStorage 是永久保存的。但换浏览器或清缓存会丢失。

**Q: 怎么测试收藏功能？**
A: 打开浏览器控制台（F12），输入：
```javascript
// 查看当前收藏
JSON.parse(localStorage.getItem('favorite_quotes'))

// 手动添加收藏
localStorage.setItem('favorite_quotes', JSON.stringify(["测试名言"]))
```

**Q: 可以收藏多少条？**
A: localStorage 总容量约 5MB，一条名言几十字，可以存几千条。

**Q: 手机上也有效吗？**
A: 有效，主流手机浏览器都支持 localStorage。

---

下一篇教程：[查看红心列表页面](./TUTORIAL_3_FAVORITES_PAGE.md)
