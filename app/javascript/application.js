// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

// ============================================
// Turbo 缓存状态管理
// ============================================
// 确保从 about/favorites 页面返回首页时状态正确恢复

// 在页面缓存前保存状态
document.addEventListener('turbo:before-cache', () => {
  // 只在首页保存状态
  if (window.location.pathname === '/') {
    // 保存当前显示的名言 ID
    const quoteCard = document.querySelector('.quote-card[data-quote-id]')
    if (quoteCard) {
      const quoteId = quoteCard.dataset.quoteId
      sessionStorage.setItem('home-quote-id', quoteId)
      console.log('[Turbo] 缓存前保存名言 ID:', quoteId)
    }

    // 保存当前页面的滚动位置
    sessionStorage.setItem('home-scroll-position', window.scrollY.toString())

    // 保存播放状态（如果页面上有音频播放器）
    const audioPlayer = document.querySelector('[data-controller="audio-player"]')
    if (audioPlayer) {
      const isPlaying = audioPlayer.dataset.playing === 'true'
      sessionStorage.setItem('home-audio-playing', isPlaying.toString())
    }
  }
})

// 在页面恢复时恢复状态
document.addEventListener('turbo:render', (event) => {
  // 检查是否是从缓存恢复的页面
  const isPreview = document.documentElement.hasAttribute('data-turbo-preview')
  if (isPreview) {
    console.log('[Turbo] 从缓存恢复页面')
  }

  // 如果是首页，检查是否需要恢复名言
  if (window.location.pathname === '/') {
    const savedQuoteId = sessionStorage.getItem('home-quote-id')
    if (savedQuoteId) {
      const quoteCard = document.querySelector('.quote-card[data-quote-id]')
      if (quoteCard && quoteCard.dataset.quoteId !== savedQuoteId) {
        // 如果服务器返回了不同的名言，强制使用缓存的
        console.log('[Turbo] 恢复名言 ID:', savedQuoteId)
        quoteCard.dataset.quoteId = savedQuoteId
      }
    }
  }
})

// 页面加载完成后恢复状态
document.addEventListener('turbo:load', () => {
  // 恢复滚动位置（如果是首页）
  if (window.location.pathname === '/') {
    const savedScroll = sessionStorage.getItem('home-scroll-position')
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll, 10))
      sessionStorage.removeItem('home-scroll-position')
    }
  }
})
