/**
 * BottomMenuController - 底部菜单控制器
 * ============================================
 * 功能说明：
 * 管理首页底部菜单的展开/关闭、分享功能、导航等功能
 *
 * 核心功能：
 * 1. 菜单控制 - 展开/关闭底部弹出菜单
 * 2. 分享功能 - 创建分享链接并复制到剪贴板（支持跨平台）
 * 3. 导航处理 - 使用 Turbo 进行无刷新页面导航
 *
 * 分享功能开发历程与跨平台兼容方案：
 * --------------------------------------------
 * 问题1：Navigator.clipboard API 在某些浏览器中不可用
 * 症状：TypeError: undefined is not an object (evaluating 'navigator.clipboard.writeText')
 * 解决：提供降级方案使用 document.execCommand('copy')
 *
 * 问题2：iOS Safari 复制失败
 * 症状：iOS 16 上复制失败，降级方案也无效
 * 原因：iOS 要求元素在视口内且可见，且需要特殊处理
 * 解决：使用 requestAnimationFrame + 全屏 textarea 方案
 *
 * 问题3：Mac 桌面浏览器出现 CSRF 错误
 * 症状：SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 * 原因：CSRF 验证失败返回 HTML 错误页面，前端尝试解析 JSON 失败
 * 解决：后端添加 rescue_from 处理，前端添加 Accept: application/json 请求头
 *
 * 问题4：数据库约束阻止匿名分享
 * 症状：SQLite3::ConstraintException: NOT NULL constraint failed: shared_quotes.user_id
 * 解决：添加数据库迁移，将 user_id 改为允许 NULL
 *
 * 当前架构：三层降级策略
 * - 第一层：现代 Clipboard API（Chrome/Edge/Safari 最新版）
 * - 第二层：iOS 专用方案（requestAnimationFrame + 全屏 textarea）
 * - 第三层：传统 execCommand（IE/旧浏览器）
 * - 终极降级：显示对话框让用户手动复制
 */
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // Stimulus 目标元素定义
  // trigger: 触发按钮（在 .bottom-bar 中的实例）
  // backdrop, menu: 菜单元素（在独立节点 .bottom-menu-backdrop 中的实例）
  static targets = ["trigger", "backdrop", "menu"]

  /**
   * 控制器连接时的初始化
   * 在 DOM 中连接时自动调用
   *
   * 架构说明：
   * - 触发按钮和菜单分别位于独立的 DOM 节点
   * - 通过自定义事件进行跨实例通信
   * - 菜单实例监听事件来控制显示/隐藏
   */
  connect() {
    console.log("Bottom menu controller connected")

    // 如果当前实例有菜单目标（即独立节点实例），则监听全局事件
    if (this.hasBackdropTarget && this.hasMenuTarget) {
      this._handleOpen = this._handleOpen.bind(this)
      this._handleClose = this._handleClose.bind(this)
      document.addEventListener("bottom-menu:open", this._handleOpen)
      document.addEventListener("bottom-menu:close", this._handleClose)
    }
  }

  /**
   * 控制器断开连接时清理
   */
  disconnect() {
    if (this.hasBackdropTarget && this.hasMenuTarget) {
      document.removeEventListener("bottom-menu:open", this._handleOpen)
      document.removeEventListener("bottom-menu:close", this._handleClose)
    }
  }

  /**
   * 内部方法：处理打开事件
   */
  _handleOpen() {
    this.backdropTarget.classList.add("is-open")
    this.menuTarget.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  /**
   * 内部方法：处理关闭事件
   */
  _handleClose() {
    this.backdropTarget.classList.remove("is-open")
    this.menuTarget.classList.remove("is-open")
    document.body.style.overflow = ""
  }

  /**
   * 打开底部菜单
   * @param {Event} e - 点击事件
   *
   * 视觉效果：
   * - 触发自定义事件通知菜单实例
   * - 菜单实例接收到事件后添加 is-open 类
   * - 禁止背景滚动（body overflow: hidden）
   */
  open(e) {
    if (e) e.preventDefault()
    document.dispatchEvent(new CustomEvent("bottom-menu:open"))
  }

  /**
   * 关闭底部菜单
   * @param {Event} e - 点击事件
   *
   * 清理：
   * - 触发自定义事件通知菜单实例
   * - 菜单实例接收到事件后移除 is-open 类
   * - 恢复背景滚动
   */
  close(e) {
    if (e) e.preventDefault()
    document.dispatchEvent(new CustomEvent("bottom-menu:close"))
  }

  /**
   * 菜单项点击处理
   * @param {Event} e - 点击事件
   *
   * 功能：
   * - 关闭菜单（通过触发自定义事件）
   * - 使用 Turbo 进行无刷新导航（150ms 延迟确保动画完成）
   * - 自动缓存当前页面，确保返回时能恢复状态
   *
   * Turbo 缓存机制：
   * - Turbo 会自动缓存访问过的页面
   * - 使用 data-turbo-action="restore" 返回时从缓存恢复
   * - 不需要手动干预，Turbo 默认行为即可满足需求
   */
  itemClick(e) {
    e.preventDefault()

    // 获取链接地址
    const href = e.currentTarget.getAttribute('href')

    // 关闭菜单（触发自定义事件）
    document.dispatchEvent(new CustomEvent("bottom-menu:close"))

    // 使用 Turbo 进行无刷新导航
    // 注意：Turbo 会自动缓存当前页面，返回时从缓存恢复
    setTimeout(() => {
      if (window.Turbo) {
        window.Turbo.visit(href)
      } else {
        window.location.href = href
      }
    }, 150)
  }

  /**
   * ============================================
   * 分享功能主方法
   * ============================================
   *
   * 完整流程：
   * 1. 获取当前显示的名言 ID
   * 2. 关闭底部菜单
   * 3. 调用后端 API 创建分享记录
   * 4. 尝试复制链接到剪贴板（跨平台兼容）
   * 5. 复制失败时显示手动复制对话框
   *
   * 跨平台复制策略演进：
   * - 第一版：仅使用 navigator.clipboard.writeText
   *   问题：iOS 和部分旧浏览器不支持
   *
   * - 第二版：添加 execCommand('copy') 降级
   *   问题：iOS 16 仍然失败
   *
   * - 第三版：iOS 专用方案（requestAnimationFrame + 全屏元素）
   *   成功：覆盖所有主流平台
   *
   * @param {Event} e - 点击事件
   */
  async share(e) {
    e.preventDefault()

    // 获取当前名言的 ID
    // 从 data-quote-id 属性读取，默认为 1
    const quoteCard = document.querySelector('.quote-card[data-quote-id]')
    const quoteId = quoteCard ? quoteCard.dataset.quoteId : '1'

    // 关闭菜单（触发自定义事件）
    document.dispatchEvent(new CustomEvent("bottom-menu:close"))

    try {
      // 获取 CSRF Token（兼容不同浏览器的选择器）
      // 优先使用 meta[name="csrf-token"]，降级使用 [name="csrf-token"]
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ||
                       document.querySelector('[name="csrf-token"]')?.content || ''

      console.log('CSRF Token:', csrfToken ? '已获取' : '未找到')

      // 调用后端 API 创建分享链接
      const response = await fetch('/api/create_share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',  // 明确要求 JSON 响应
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ quote_id: quoteId })
      })

      // 防御性检查：确保响应是 JSON 格式
      // 如果后端返回 HTML（如 CSRF 错误页面），提前捕获并提示
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('非 JSON 响应:', text.substring(0, 200))
        throw new Error('服务器返回格式错误，请刷新页面重试')
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '创建分享链接失败')
      }

      const data = await response.json()

      // 尝试复制到剪贴板（三层降级策略）
      try {
        await this.copyToClipboard(data.url)
        this.showToast(`链接已复制！有效期至 ${data.expires_at}`)
      } catch (copyErr) {
        // 所有自动复制方式都失败，显示手动复制对话框
        console.warn('自动复制失败，显示对话框:', copyErr)
        this.showShareDialog(data.url, data.expires_at)
      }
    } catch (err) {
      console.error('分享失败:', err)
      this.showToast(err.message || '分享失败，请重试')
    }
  }

  /**
   * ============================================
   * 剪贴板复制 - 三层降级策略
   * ============================================
   *
   * 架构设计：
   * 根据用户代理检测平台类型，优先使用最适合该平台的方案
   *
   * 平台检测：
   * - iOS: /iPad|iPhone|iPod/.test(navigator.userAgent)
   * - 其他: 使用标准检测
   *
   * 降级顺序：
   * 1. iOS 专用方案（如果是 iOS）
   * 2. 现代 Clipboard API
   * 3. 传统 execCommand
   *
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  async copyToClipboard(text) {
    // 检测 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // iOS Safari 特殊处理
    if (isIOS) {
      try {
        return await this.copyToClipboardIOS(text)
      } catch (err) {
        console.warn('iOS 专用复制失败，尝试其他方案:', err)
      }
    }

    // 优先使用现代 Clipboard API
    // 支持的浏览器：Chrome 66+, Edge 79+, Firefox 63+, Safari 13.1+
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        return await navigator.clipboard.writeText(text)
      } catch (err) {
        console.warn('Clipboard API 失败，尝试降级方案:', err)
      }
    }

    // 降级方案：使用传统的 execCommand
    return this.copyToClipboardFallback(text)
  }

  /**
   * iOS Safari 专用复制方法
   * ============================================
   *
   * iOS 特殊限制：
   * 1. 元素必须在视口内且可见（opacity: 0 可以，display: none 不行）
   * 2. 必须调用 focus() 和 select()
   * 3. 需要在 requestAnimationFrame 中执行（确保渲染完成）
   * 4. textarea 比 input 兼容性更好
   *
   * 技术细节：
   * - 使用全屏 textarea 覆盖整个视口
   * - position: fixed 确保元素在视口内
   * - z-index: -1 确保不遮挡其他元素
   * - readOnly 防止键盘弹出
   *
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  async copyToClipboardIOS(text) {
    // iOS 16+ 优先尝试 Clipboard API
    // 新 iOS 版本已经支持 clipboard API，优先尝试更高效
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return
      } catch (err) {
        console.log('iOS Clipboard API 失败，使用降级方案')
      }
    }

    // iOS 降级方案：使用 execCommand
    return new Promise((resolve, reject) => {
      // 创建全屏 textarea
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.readOnly = true
      textarea.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        z-index: -1;
        font-size: 16px;  /* iOS 需要至少 16px 防止缩放 */
      `
      document.body.appendChild(textarea)

      // requestAnimationFrame 确保 DOM 渲染完成
      requestAnimationFrame(() => {
        try {
          // 聚焦并选择文本
          textarea.focus()
          textarea.select()
          textarea.setSelectionRange(0, 999999)  // iOS 需要大数值

          // 执行复制命令
          const success = document.execCommand('copy')
          document.body.removeChild(textarea)

          if (success) {
            resolve()
          } else {
            reject(new Error('iOS execCommand 复制失败'))
          }
        } catch (err) {
          document.body.removeChild(textarea)
          reject(err)
        }
      })
    })
  }

  /**
   * 传统降级方案
   * ============================================
   *
   * 适用场景：
   * - IE 11
   * - 旧版 Android 浏览器
   * - 其他不支持 Clipboard API 的浏览器
   *
   * 技术细节：
   * - 创建不可见的 textarea 元素
   * - 使用 setSelectionRange 确保兼容性
   * - 元素定位在视口中心
   *
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  copyToClipboardFallback(text) {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      `
      document.body.appendChild(textarea)

      try {
        textarea.focus()
        textarea.select()
        textarea.setSelectionRange(0, 999999)

        const success = document.execCommand('copy')
        if (success) {
          resolve()
        } else {
          reject(new Error('复制命令执行失败'))
        }
      } catch (err) {
        reject(err)
      } finally {
        document.body.removeChild(textarea)
      }
    })
  }

  /**
   * 显示分享链接对话框
   * ============================================
   *
   * 使用场景：
   * 当所有自动复制方式都失败时，作为终极降级方案
   *
   * 功能：
   * - 显示完整的分享链接
   * - 自动选中链接文本方便用户手动复制
   * - 显示有效期信息
   *
   * @param {string} url - 分享链接
   * @param {string} expiresAt - 过期时间字符串
   */
  showShareDialog(url, expiresAt) {
    // 创建遮罩层和对话框
    const dialog = document.createElement('div')
    dialog.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    `

    dialog.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        max-width: 360px;
        width: 100%;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin: 0 0 0.5rem; font-size: 1.1rem; color: #292524;">分享链接已生成</h3>
        <p style="margin: 0 0 1rem; font-size: 0.875rem; color: #a8a29e;">有效期至 ${expiresAt}</p>
        <div style="
          background: #f5f5f4;
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          word-break: break-all;
          font-size: 0.875rem;
          color: #57534e;
          user-select: all;
        ">${url}</div>
        <button id="close-share-dialog" style="
          background: #DC4C3E;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          width: 100%;
        ">知道了</button>
      </div>
    `

    document.body.appendChild(dialog)

    // 自动选择链接文本方便用户手动复制
    const urlDiv = dialog.querySelector('div > div')
    if (urlDiv) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(urlDiv)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // 关闭按钮事件
    dialog.querySelector('#close-share-dialog').addEventListener('click', () => {
      document.body.removeChild(dialog)
    })

    // 点击背景关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog)
      }
    })
  }

  /**
   * 显示 Toast 提示
   * @param {string} message - 提示消息
   *
   * 动画效果：
   * - 淡入 + 缩放
   * - 显示 2 秒后自动淡出
   */
  showToast(message) {
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
