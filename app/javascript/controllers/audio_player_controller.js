import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["audio", "button", "playIcon", "pauseIcon", "status"]

  connect() {
    this.isPlaying = false

    // 监听音频事件
    this.audioTarget.addEventListener('ended', this.handleEnded.bind(this))
    this.audioTarget.addEventListener('error', this.handleError.bind(this))

    // 监听页面可见性变化（从登录页返回时）
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // 监听 BroadcastChannel 消息（登录成功通知）
    if (typeof BroadcastChannel !== 'undefined') {
      this.loginChannel = new BroadcastChannel('login_channel')
      this.loginChannel.onmessage = (event) => {
        if (event.data.action === 'login_success') {
          this.refreshNavBar()
        }
      }
    }

    // 检查是否刚从登录页返回
    this.checkLoginStatus()
  }

  disconnect() {
    this.audioTarget.removeEventListener('ended', this.handleEnded.bind(this))
    this.audioTarget.removeEventListener('error', this.handleError.bind(this))
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    // 关闭 BroadcastChannel
    if (this.loginChannel) {
      this.loginChannel.close()
    }
  }

  // 处理页面可见性变化（从其他页面返回时）
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // 页面变为可见，检查登录状态
      this.checkLoginStatus()
    }
  }

  // 检查是否刚从登录页返回
  checkLoginStatus() {
    const justLoggedIn = localStorage.getItem('justLoggedIn')
    if (justLoggedIn === 'true') {
      // 清除标志
      localStorage.removeItem('justLoggedIn')
      localStorage.removeItem('loginTime')
      // 刷新导航栏
      this.refreshNavBar()
    }
  }

  // 刷新导航栏（获取最新登录状态）
  async refreshNavBar() {
    try {
      // 发送请求获取新的导航栏 HTML
      const response = await fetch('/shared/nav_bar', {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const html = await response.text()
        const navBar = document.getElementById('nav-bar')
        if (navBar) {
          navBar.outerHTML = html
          console.log('导航栏已更新')
        }
      }
    } catch (error) {
      console.error('刷新导航栏失败:', error)
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  play() {
    this.audioTarget.play().then(() => {
      this.isPlaying = true
      this.updateUI()
    }).catch(error => {
      console.error('播放失败:', error)
      this.statusTarget.textContent = '播放失败，请重试'
    })
  }

  pause() {
    this.audioTarget.pause()
    this.isPlaying = false
    this.updateUI()
  }

  updateUI() {
    if (this.isPlaying) {
      // 显示暂停图标
      this.playIconTarget.classList.add('hidden')
      this.pauseIconTarget.classList.remove('hidden')
      // 按钮样式变化
      this.buttonTarget.classList.add('playing')
      // 更新状态文字
      this.statusTarget.textContent = '正在播放...'
    } else {
      // 显示播放图标
      this.playIconTarget.classList.remove('hidden')
      this.pauseIconTarget.classList.add('hidden')
      // 按钮样式恢复
      this.buttonTarget.classList.remove('playing')
      // 更新状态文字
      this.statusTarget.textContent = '已暂停，点击继续播放'
    }
  }

  handleEnded() {
    this.isPlaying = false
    this.updateUI()
    this.statusTarget.textContent = '播放完成，点击重新播放'
  }

  handleError(event) {
    console.error('音频加载失败:', event)
    this.isPlaying = false
    this.updateUI()
    this.statusTarget.textContent = '音频加载失败'
  }
}
