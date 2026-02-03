import { Controller } from "@hotwired/stimulus"

// ============================================
// 收藏功能控制器
// ============================================
// 这个控制器处理红心按钮的点击事件和收藏状态的切换
export default class FavoriteController extends Controller {
  // 定义目标：可以在控制器中访问的 HTML 元素
  static targets = ["button"]

  // 定义值：从 HTML 数据属性传递过来的值
  static values = { quote: String }

  // ============================================
  // 连接方法：当控制器连接到 DOM 时自动执行
  // ============================================
  // 页面加载时，检查当前名言是否已收藏，并更新按钮状态
  connect() {
    this.updateButtonState()
    // 标记是否有待执行的收藏操作（用于登录后自动收藏）
    this.pendingFavorite = false
  }

  // ============================================
  // 切换收藏状态：点击红心按钮时触发
  // ============================================
  toggle() {
    // 检查登录状态
    if (!this.isLoggedIn()) {
      // 未登录：记录待执行的收藏操作，并打开登录模态框
      this.pendingFavorite = true
      this.openAuthModal()
      return
    }

    // 已登录：切换收藏状态
    if (this.isFavorited()) {
      this.removeFavorite()
    } else {
      this.saveFavorite()
    }

    // 更新按钮显示
    this.updateButtonState()
  }

  // ============================================
  // 检查用户是否已登录
  // ============================================
  // 通过检查页面中的登录状态标志
  isLoggedIn() {
    // 方法1: 检查 body 或 html 上的 data-user-logged-in 属性
    const bodyFlag = document.body.dataset.userLoggedIn
    if (bodyFlag === 'true') return true

    // 方法2: 检查是否存在登出按钮或用户信息显示
    const logoutButton = document.querySelector('form[action="/logout"]')
    const userEmail = document.querySelector('.user-email')
    if (logoutButton || userEmail) return true

    // 方法3: 检查 localStorage（用于开发测试）
    const loggedIn = localStorage.getItem('user_logged_in')
    if (loggedIn === 'true') return true

    return false
  }

  // ============================================
  // 打开登录模态框
  // ============================================
  // 通过获取 auth-modal 控制器并调用其 open 方法
  openAuthModal() {
    // 查找页面上的 auth-modal 控制器
    const authModalElement = document.querySelector('[data-controller="auth-modal"]')

    if (authModalElement && window.Stimulus) {
      const authModalController = window.Stimulus.getControllerForElementAndIdentifier(
        authModalElement,
        'auth-modal'
      )

      if (authModalController) {
        // 打开模态框（登录模式）
        authModalController.open()
        // 监听登录成功事件
        this.bindLoginSuccessEvent()
      } else {
        console.warn('[Favorite] 未找到 auth-modal 控制器')
        // 降级：跳转登录页面
        window.location.href = '/login'
      }
    } else {
      console.warn('[Favorite] 未找到 auth-modal 元素或 Stimulus 未加载')
      // 降级：跳转登录页面
      window.location.href = '/login'
    }
  }

  // ============================================
  // 绑定登录成功事件
  // ============================================
  // 监听登录成功后的自动收藏
  bindLoginSuccessEvent() {
    // 避免重复绑定
    if (this._loginSuccessBound) return
    this._loginSuccessBound = true

    // 监听自定义登录成功事件
    const handleLoginSuccess = (event) => {
      console.log('[Favorite] 登录成功事件触发')
      // 检查是否有待执行的收藏操作
      if (this.pendingFavorite) {
        console.log('[Favorite] 执行待处理的收藏操作')
        this.pendingFavorite = false
        // 延迟一点执行，确保页面状态已更新
        setTimeout(() => {
          this.saveFavorite()
          this.updateButtonState()
        }, 100)
      }
    }

    // 监听自定义事件（auth-modal 控制器在登录成功后会派发此事件）
    document.addEventListener('auth:login:success', handleLoginSuccess)

    // 同时监听导航栏更新事件作为备选
    const observer = new MutationObserver((mutations) => {
      if (this.pendingFavorite && this.isLoggedIn()) {
        console.log('[Favorite] 检测到登录状态变化，执行待处理的收藏')
        this.pendingFavorite = false
        setTimeout(() => {
          this.saveFavorite()
          this.updateButtonState()
        }, 100)
      }
    })

    // 观察导航栏的变化
    const navBar = document.getElementById('nav-bar')
    if (navBar) {
      observer.observe(navBar, { childList: true, subtree: true })
    }
  }

  // ============================================
  // 检查是否已收藏
  // ============================================
  isFavorited() {
    const favorites = this.getFavorites()
    return favorites.includes(this.quoteValue)
  }

  // ============================================
  // 保存收藏到 localStorage
  // ============================================
  saveFavorite() {
    const favorites = this.getFavorites()
    if (!favorites.includes(this.quoteValue)) {
      favorites.push(this.quoteValue)
      localStorage.setItem('favorite_quotes', JSON.stringify(favorites))
      console.log('[Favorite] 已收藏:', this.quoteValue)
    }
  }

  // ============================================
  // 从 localStorage 删除收藏
  // ============================================
  removeFavorite() {
    const favorites = this.getFavorites()
    const filtered = favorites.filter(quote => quote !== this.quoteValue)
    localStorage.setItem('favorite_quotes', JSON.stringify(filtered))
    console.log('[Favorite] 已取消收藏:', this.quoteValue)
  }

  // ============================================
  // 从 localStorage 获取所有收藏
  // ============================================
  getFavorites() {
    const stored = localStorage.getItem('favorite_quotes')
    return stored ? JSON.parse(stored) : []
  }

  // ============================================
  // 更新按钮的视觉状态
  // ============================================
  updateButtonState() {
    const iconElement = this.buttonTarget.querySelector('.heart-icon')

    if (this.isFavorited()) {
      // 已收藏：添加 favorited 类，显示实心红心
      this.buttonTarget.classList.add('favorited')
      this.buttonTarget.setAttribute('aria-label', '取消收藏这条名言')
      if (iconElement) {
        iconElement.textContent = '❤️'  // 实心红心
      }
    } else {
      // 未收藏：移除 favorited 类，显示空心红心
      this.buttonTarget.classList.remove('favorited')
      this.buttonTarget.setAttribute('aria-label', '收藏这条名言')
      if (iconElement) {
        iconElement.textContent = '🤍'  // 空心红心
      }
    }
  }
}
