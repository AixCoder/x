import { Controller } from "@hotwired/stimulus"

// ============================================
// 登录按钮控制器
// ============================================
// 处理登录按钮的点击事件，动态加载登录模态框
export default class extends Controller {
  // ============================================
  // 打开登录模态框
  // ============================================
  // 点击登录按钮时触发，动态加载并显示登录模态框
  async openModal() {
    const container = document.getElementById('auth-modal-container')
    
    // 如果模态框已经加载，直接显示
    const existingModal = container.querySelector('[data-controller*="auth-modal"]')
    if (existingModal) {
      this.showModal(existingModal)
      return
    }
    
    // 如果模态框未加载，通过 fetch 请求加载
    try {
      const response = await fetch('/auth_modal', {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        container.innerHTML = html
        
        // 等待 Stimulus 连接控制器
        await this.waitForStimulus()
        
        // 显示模态框
        const modalElement = container.querySelector('[data-controller*="auth-modal"]')
        if (modalElement) {
          this.showModal(modalElement)
        }
      } else {
        console.error('加载登录模态框失败')
      }
    } catch (error) {
      console.error('加载登录模态框失败:', error)
    }
  }
  
  // ============================================
  // 等待 Stimulus 连接控制器
  // ============================================
  // 确保 Stimulus 已经连接了 auth-modal 控制器
  waitForStimulus() {
    return new Promise((resolve) => {
      const checkController = () => {
        const modalElement = document.querySelector('[data-controller*="auth-modal"]')
        if (modalElement && window.Stimulus) {
          const controller = window.Stimulus.getControllerForElementAndIdentifier(
            modalElement,
            'auth-modal'
          )
          if (controller) {
            resolve()
          } else {
            setTimeout(checkController, 50)
          }
        } else {
          setTimeout(checkController, 50)
        }
      }
      checkController()
    })
  }
  
  // ============================================
  // 显示模态框
  // ============================================
  // 通过 Stimulus 控制器打开模态框
  showModal(modalElement) {
    if (window.Stimulus) {
      const modalController = window.Stimulus.getControllerForElementAndIdentifier(
        modalElement,
        'auth-modal'
      )
      
      if (modalController) {
        modalController.open()
      }
    }
  }
}
