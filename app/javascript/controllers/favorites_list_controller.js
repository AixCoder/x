import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.loadFavorites()
  }

  loadFavorites() {
    const container = this.element.querySelector('#favorites-list')
    if (!container) return

    // 从 localStorage 获取收藏
    const stored = localStorage.getItem('favorite_quotes')
    const favorites = stored ? JSON.parse(stored) : []

    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>还没有收藏任何名言</p>
          <a href="/" class="browse-link">去首页浏览</a>
        </div>
      `
      return
    }

    // 渲染收藏列表
    const listHtml = favorites.map(quote => `
      <div class="favorite-item">
        <p class="favorite-quote">${this.escapeHtml(quote)}</p>
        <button type="button" class="remove-btn" data-quote="${this.escapeHtml(quote)}" data-action="click->favorites-list#remove">
          移除
        </button>
      </div>
    `).join('')

    container.innerHTML = listHtml
  }

  remove(e) {
    const quote = e.target.dataset.quote
    if (!quote) return

    // 从 localStorage 移除
    const stored = localStorage.getItem('favorite_quotes')
    const favorites = stored ? JSON.parse(stored) : []
    const filtered = favorites.filter(q => q !== quote)
    localStorage.setItem('favorite_quotes', JSON.stringify(filtered))

    // 重新加载列表
    this.loadFavorites()
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
