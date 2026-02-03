import { Controller } from "@hotwired/stimulus"

// 极简登录页面控制器
// 处理从播放页面跳转过来的登录，成功后返回播放页面而不刷新
export default class extends Controller {
  static targets = ["error"]

  connect() {
    console.log("Simple login controller connected")
  }

  async submit(event) {
    event.preventDefault()
    const form = event.target

    // 隐藏错误提示
    this.hideError()

    const formData = new FormData(form)

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'text/vnd.turbo-stream.html',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      })

      if (response.ok) {
        // 登录成功
        const turboStreamHtml = await response.text()
        console.log('Login successful, processing Turbo Stream...')

        // 存储登录成功标志，通知播放页面更新
        localStorage.setItem('justLoggedIn', 'true')
        localStorage.setItem('loginTime', Date.now().toString())

        // 如果有 BroadcastChannel，也发送通知（更实时）
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('login_channel')
          channel.postMessage({ action: 'login_success' })
          channel.close()
        }

        // 延迟后返回播放页面
        setTimeout(() => {
          if (window.history.length > 1) {
            window.history.back()
          } else {
            window.Turbo.visit('/player', { action: 'restore' })
          }
        }, 300)

      } else {
        // 登录失败
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          this.showError(data.error || '邮箱或密码错误')
        } else {
          this.showError('邮箱或密码错误')
        }
      }
    } catch (error) {
      console.error('登录请求失败:', error)
      this.showError('网络错误，请重试')
    }
  }

  // 手动处理 Turbo Stream
  processTurboStreamManually(html) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const streamElements = tempDiv.querySelectorAll('turbo-stream')

    streamElements.forEach(el => {
      const target = el.getAttribute('target')
      const action = el.getAttribute('action')
      const template = el.querySelector('template')

      if (target && action && template) {
        // 通过 window.opener 更新父窗口（如果是新窗口打开）
        // 或通过广播更新其他窗口
        const targetEl = document.getElementById(target)
        if (targetEl) {
          const content = template.innerHTML
          switch (action) {
            case 'replace':
              targetEl.outerHTML = content
              break
            case 'append':
              targetEl.insertAdjacentHTML('beforeend', content)
              break
            case 'update':
              targetEl.innerHTML = content
              break
          }
        }
      }
    })

    tempDiv.remove()
  }

  showError(message) {
    if (this.hasErrorTarget) {
      this.errorTarget.textContent = message
      this.errorTarget.style.display = 'block'
    }
  }

  hideError() {
    if (this.hasErrorTarget) {
      this.errorTarget.style.display = 'none'
    }
  }
}
