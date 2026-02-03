import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["backdrop", "menu"]

  connect() {
    console.log("Bottom menu controller connected")
  }

  open(e) {
    if (e) e.preventDefault()
    this.backdropTarget.classList.add("is-open")
    this.menuTarget.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  close(e) {
    if (e) e.preventDefault()
    this.backdropTarget.classList.remove("is-open")
    this.menuTarget.classList.remove("is-open")
    document.body.style.overflow = ""
  }

  // 点击菜单项
  itemClick(e) {
    e.preventDefault()

    // 获取链接地址
    const href = e.currentTarget.getAttribute('href')

    // 关闭菜单
    this.backdropTarget.classList.remove("is-open")
    this.menuTarget.classList.remove("is-open")
    document.body.style.overflow = ""

    // 使用 Turbo 进行无刷新导航
    setTimeout(() => {
      if (window.Turbo) {
        window.Turbo.visit(href)
      } else {
        window.location.href = href
      }
    }, 150)
  }

  // 分享功能：调用 API 创建分享链接并复制到剪贴板
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

  // 显示提示消息
  showToast(message) {
    // 创建提示元素
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 0.875rem;
      z-index: 9999;
      animation: fadeInOut 2s ease forwards;
    `

    // 添加动画样式
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
    `
    document.head.appendChild(style)

    document.body.appendChild(toast)

    // 2秒后移除
    setTimeout(() => {
      toast.remove()
      style.remove()
    }, 2000)
  }
}
