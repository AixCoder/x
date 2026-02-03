import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  async submit(event) {
    event.preventDefault()
    const form = event.target

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin"
      })

      if (response.ok) {
        const data = await response.json()
        // 登录成功，使用 Turbo 返回首页（不刷新）
        if (window.Turbo) {
          // 使用 replace 操作重新加载当前页面（更新导航栏）
          const currentUrl = window.location.pathname + window.location.search
          window.Turbo.visit(currentUrl, { action: "replace" })
        } else {
          window.location.href = "/"
        }
      } else {
        const data = await response.json()
        this.showError(data.error || "登录失败")
      }
    } catch (error) {
      console.error("登录请求失败:", error)
      this.showError("网络错误，请重试")
    }
  }

  showError(message) {
    // 创建错误提示
    const errorDiv = document.createElement("div")
    errorDiv.className = "flash-message flash-alert"
    errorDiv.textContent = message

    const form = this.element
    form.insertBefore(errorDiv, form.firstChild)

    // 3秒后移除
    setTimeout(() => errorDiv.remove(), 3000)
  }
}
