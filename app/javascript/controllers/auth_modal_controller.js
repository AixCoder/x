import { Controller } from "@hotwired/stimulus"

/**
 * AuthModalController - 认证模态框控制器
 *
 * 功能说明：
 * 本控制器管理登录/注册模态框的行为，包括：
 * 1. 模态框的打开和关闭动画
 * 2. 登录/注册模式切换
 * 3. 表单提交（支持两种模式的不同端点）
 * 4. 小猫SVG动画交互（根据输入框焦点变化）
 * 5. 错误消息显示
 *
 * 使用方式：
 * - 在HTML元素上添加 data-controller="auth-modal"
 * - 通过 data-action="click->auth-modal#open" 触发打开
 * - 通过 data-action="click->auth-modal#close" 触发关闭
 */
export default class extends Controller {
    /**
     * 定义控制器中使用的目标元素
     * 这些元素可以通过 this.xxxTarget 访问
     */
    static targets = [
        "backdrop",            // 模态框遮罩层
        "catWrapper",          // 小猫动画容器
        "titleText",           // 模态框标题
        "submitBtn",           // 提交按钮
        "toggleBtn",           // 切换登录/注册模式的链接
        "errorMessage",        // 错误消息容器
        "errorText",           // 错误消息文本
        "form",                // 表单元素
        "emailField",          // 邮箱输入框
        "passwordField",       // 密码输入框
        "passwordConfirmGroup" // 密码确认输入框组（仅注册模式显示）
    ]

    /**
     * 控制器初始化
     * 当控制器连接到DOM时自动调用
     */
    connect() {
        // 初始化当前模式为登录
        this.mode = "login"
        // 设置表单提交的目标URL
        this.loginUrl = "/login"
        this.registerUrl = "/signup"
        // 更新界面文本
        this.updateTexts()
        // 初始化表单字段（确保name属性正确）
        this.updateFormFields()
        console.log("[AuthModal] 控制器已初始化，模式:", this.mode)
    }

    // ============================================
    // 模态框显示控制
    // ============================================

    /**
     * 打开模态框
     * @param {Event} e - 点击事件（可选）
     *
     * 给遮罩层添加 is-open 类，触发CSS过渡动画显示模态框
     */
    open(e) {
        console.log("open auth view")
        if (e) e.preventDefault()
        // 确保是登录模式（默认）
        if (this.mode !== "login") {
            this.mode = "login"
            this.updateTexts()
            this.updateFormFields()
        }
        this.backdropTarget.classList.add("is-open")
    }

    /**
     * 打开模态框并切换到注册模式
     * @param {Event} e - 点击事件（可选）
     *
     * 用于右上角"注册"按钮，直接打开注册界面
     */
    openRegister(e) {
        console.log("open auth modal view (register mode)")
        if (e) e.preventDefault()
        // 切换到注册模式
        this.mode = "register"
        this.updateTexts()
        this.updateFormFields()
        this.backdropTarget.classList.add("is-open")
    }

    /**
     * 关闭模态框
     * @param {Event} e - 点击事件（可选）
     *
     * 移除 is-open 类隐藏模态框，并重置小猫动画状态
     */
    close(e) {
        if (e) e.preventDefault()
        this.backdropTarget.classList.remove("is-open")
        this.blurInput() // 重置小猫状态
    }

    // ============================================
    // 登录/注册模式切换
    // ============================================

    /**
     * 切换登录/注册模式
     * @param {Event} e - 点击事件（可选）
     *
     * 在登录和注册模式之间切换，更新界面文本和表单字段
     */
    toggleMode(e) {
        if (e) e.preventDefault()
        // 切换模式
        this.mode = this.mode === "login" ? "register" : "login"
        // 更新界面显示
        this.updateTexts()
        // 更新表单字段显示
        this.updateFormFields()
        // 隐藏之前的错误消息
        this.hideError()
    }

    /**
     * 更新界面文本
     * 根据当前模式（login/register）更新标题、按钮和链接文本
     */
    updateTexts() {
        if (this.mode === "login") {
            this.titleTextTarget.textContent = "peter-cat"
            this.submitBtnTarget.value = "Enter"
            this.toggleBtnTarget.textContent = "Not a member? Join"
        } else {
            this.titleTextTarget.textContent = "join the club"
            this.submitBtnTarget.value = "Join"
            this.toggleBtnTarget.textContent = "Already a member? Enter"
        }
    }

    /**
     * 更新表单字段显示
     * 根据当前模式显示/隐藏密码确认字段，并更新表单action
     */
    updateFormFields() {
        console.log("[AuthModal] 更新表单字段，当前模式:", this.mode)

        // 控制密码确认字段的显示/隐藏 - 使用 CSS 类保持布局稳定
        if (this.hasPasswordConfirmGroupTarget) {
            if (this.mode === "register") {
                this.passwordConfirmGroupTarget.classList.add("is-visible")
                // 添加required属性
                const confirmInput = this.passwordConfirmGroupTarget.querySelector('input')
                if (confirmInput) confirmInput.required = true
            } else {
                this.passwordConfirmGroupTarget.classList.remove("is-visible")
                // 移除required属性
                const confirmInput = this.passwordConfirmGroupTarget.querySelector('input')
                if (confirmInput) confirmInput.required = false
            }
        }

        // 更新表单action URL
        if (this.hasFormTarget) {
            const newAction = this.mode === "login" ? this.loginUrl : this.registerUrl
            this.formTarget.action = newAction
            console.log("[AuthModal] 表单action已更新为:", newAction)
        }

        // 更新表单字段的name属性以匹配后端期望的参数格式
        // 登录使用 session[email], session[password]
        // 注册使用 user[email], user[password]
        const prefix = this.mode === "login" ? "session" : "user"
        console.log("[AuthModal] 使用参数前缀:", prefix)

        if (this.hasEmailFieldTarget) {
            this.emailFieldTarget.name = `${prefix}[email]`
            console.log("[AuthModal] email字段name已更新为:", this.emailFieldTarget.name)
        } else {
            console.warn("[AuthModal] 未找到emailField target")
        }

        if (this.hasPasswordFieldTarget) {
            this.passwordFieldTarget.name = `${prefix}[password]`
            console.log("[AuthModal] password字段name已更新为:", this.passwordFieldTarget.name)
        } else {
            console.warn("[AuthModal] 未找到passwordField target")
        }
    }

    // ============================================
    // 小猫动画交互
    // ============================================

    /**
     * 邮箱输入框获得焦点时
     * 小猫看向邮箱输入框（添加CSS类触发动画）
     */
    focusEmail() {
        this.resetCat()
        // 添加CSS类移动小猫眼睛
        this.catWrapperTarget.classList.add("cat-looking")
    }

    /**
     * 密码输入框获得焦点时
     * 小猫捂住眼睛（表示隐私保护）
     */
    focusPassword() {
        this.resetCat()
        // 添加CSS类举起小猫爪子
        this.catWrapperTarget.classList.add("cat-covering")
    }

    /**
     * 输入框失去焦点时
     * 重置小猫动画状态
     */
    blurInput() {
        this.resetCat()
    }

    /**
     * 重置小猫动画
     * 移除所有动画相关的CSS类
     */
    resetCat() {
        this.catWrapperTarget.classList.remove("cat-looking", "cat-covering")
    }

    // ============================================
    // 表单提交处理
    // ============================================

    /**
     * 处理表单提交
     * @param {Event} event - 表单提交事件
     *
     * 根据当前模式（login/register）提交到不同的后端端点
     * 支持Turbo Stream响应以实现无刷新页面更新
     */
    async submitForm(event) {
        event.preventDefault()
        const form = event.target

        // 隐藏之前的错误消息
        this.hideError()

        // 强制更新表单字段名称，确保与当前模式匹配
        this.updateFormFields()

        // 获取表单数据
        const formData = new FormData(form)

        // 调试：打印表单数据
        console.log("[AuthModal] 当前模式:", this.mode)
        console.log("[AuthModal] 表单action:", form.action)
        console.log("[AuthModal] 表单字段:")
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${key.includes('password') ? '***' : value}`)
        }

        // 根据当前模式确定提交URL
        const submitUrl = this.mode === "login" ? this.loginUrl : this.registerUrl
        console.log("[AuthModal] 提交URL:", submitUrl)

        // 获取CSRF token（Rails使用它来防止跨站请求伪造攻击）
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
        console.log("[AuthModal] CSRF token:", csrfToken ? '已获取' : '未找到')

        try {
            // 发送AJAX请求
            // 优先使用JSON格式（轻量API模式）
            const response = await fetch(submitUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'same-origin'
            })

            if (response.ok) {
                // 处理成功响应
                await this.handleSuccessResponse(response)
            } else {
                // 处理错误响应
                await this.handleErrorResponse(response)
            }
        } catch (error) {
            console.error(`${this.mode === "login" ? '登录' : '注册'}请求失败:`, error)
            this.showError('网络错误，请重试')
        }
    }

    /**
     * 处理成功响应
     * @param {Response} response - Fetch响应对象
     *
     * 登录/注册成功后：
     * 1. 关闭模态框
     * 2. 显示成功提示
     * 3. 使用后端返回的HTML直接更新导航栏和flash容器（无刷新）
     * 4. 触发登录成功事件（供其他组件监听）
     */
    async handleSuccessResponse(response) {
        const contentType = response.headers.get('content-type')
        console.log('[AuthModal] 成功响应Content-Type:', contentType)

        // 关闭模态框
        this.close()

        if (contentType && contentType.includes('application/json')) {
            // JSON API 响应（轻量模式）
            const data = await response.json()
            console.log('[AuthModal] JSON成功数据:', data)

            // 显示成功提示
            this.showToast(data.message || (this.mode === "login" ? '登录成功！' : '欢迎加入！注册成功！'))

            // 使用后端返回的HTML更新页面（不刷新）
            if (data.nav_bar_html) {
                this.updateNavBar(data.nav_bar_html)
            }
            if (data.flash_html) {
                this.updateFlashContainer(data.flash_html)
            }

            // 触发登录成功事件（供收藏等组件监听）
            this.dispatchLoginSuccessEvent(data.user)
        } else if (contentType && contentType.includes('text/vnd.turbo-stream.html')) {
            // Turbo Stream响应（兼容旧模式）
            const turboStreamHtml = await response.text()
            console.log('[AuthModal] Turbo Stream HTML:', turboStreamHtml)

            // 显示成功提示
            this.showToast(this.mode === "login" ? '登录成功！' : '欢迎加入！注册成功！')

            // 使用Turbo渲染Stream
            if (window.Turbo && window.Turbo.renderStreamMessage) {
                window.Turbo.renderStreamMessage(turboStreamHtml)
            } else {
                // 降级方案：手动处理stream
                this.processTurboStreamManually(turboStreamHtml)
            }
        } else {
            // 其他响应格式，降级为刷新页面
            console.warn('[AuthModal] 未知响应格式，降级为刷新页面')
            this.showToast(this.mode === "login" ? '登录成功！' : '欢迎加入！注册成功！')
            setTimeout(() => window.location.reload(), 1000)
        }
    }

    /**
     * 更新导航栏
     * @param {string} html - 导航栏HTML内容
     *
     * 直接替换导航栏DOM，不刷新整个页面
     */
    updateNavBar(html) {
        const navBar = document.getElementById('nav-bar')
        if (navBar) {
            // 使用outerHTML替换整个导航栏，保持ID不变
            navBar.outerHTML = html
            console.log('[AuthModal] 导航栏已更新')
        } else {
            console.warn('[AuthModal] 未找到导航栏元素')
        }
    }

    /**
     * 更新Flash容器
     * @param {string} html - Flash消息HTML内容
     *
     * 直接替换flash容器DOM
     */
    updateFlashContainer(html) {
        const flashContainer = document.getElementById('flash-container')
        if (flashContainer) {
            flashContainer.outerHTML = html
            console.log('[AuthModal] Flash容器已更新')
        } else {
            console.warn('[AuthModal] 未找到flash容器')
        }
    }

    /**
     * 派发登录成功事件
     * @param {Object} user - 用户信息
     *
     * 供其他组件（如收藏功能）监听登录成功
     */
    dispatchLoginSuccessEvent(user) {
        console.log('[AuthModal] 派发登录成功事件', user)
        const event = new CustomEvent('auth:login:success', {
            detail: { user },
            bubbles: true,
            cancelable: true
        })
        document.dispatchEvent(event)
    }

    /**
     * 处理错误响应
     * @param {Response} response - Fetch响应对象
     *
     * 解析并显示错误消息
     */
    async handleErrorResponse(response) {
        console.log("[AuthModal] 错误响应状态:", response.status)
        const contentType = response.headers.get('content-type')
        console.log("[AuthModal] 响应Content-Type:", contentType)

        try {
            // 优先处理 JSON 格式（轻量API模式）
            if (contentType && contentType.includes('application/json')) {
                // JSON格式错误
                const data = await response.json()
                console.log("[AuthModal] JSON错误数据:", data)
                // 翻译为友好的中文错误消息
                const errorMsg = data.error || data.message || (this.mode === "login" ? '邮箱或密码错误' : '注册失败，请检查输入')
                this.showError(this.translateErrorMessage(errorMsg))
            } else if (contentType && contentType.includes('text/vnd.turbo-stream.html')) {
                // Turbo Stream格式错误（兼容旧模式）
                const text = await response.text()
                console.log("[AuthModal] Turbo Stream错误:", text)
                // 使用DOM解析提取错误消息（更可靠）
                const tempDiv = document.createElement('div')
                tempDiv.innerHTML = text
                const alertDiv = tempDiv.querySelector('.flash-alert, .flash-notice')
                if (alertDiv) {
                    const errorMsg = alertDiv.textContent.trim()
                    // 翻译为更友好的中文
                    const friendlyError = this.translateErrorMessage(errorMsg)
                    this.showError(friendlyError)
                } else {
                    this.showError(this.mode === "login" ? '邮箱或密码错误' : '注册失败，请检查输入信息')
                }
                tempDiv.remove()
            } else {
                // HTML格式错误（Rails flash消息）
                const text = await response.text()
                console.log("[AuthModal] HTML错误响应:", text.substring(0, 500))
                // 尝试从HTML中提取错误消息
                const errorMatch = text.match(/flash\[:alert\]\s*=\s*["'](.+?)["']/) ||
                                  text.match(/alert["']?\s*[:=]\s*["'](.+?)["']/) ||
                                  text.match(/<div[^>]*class="[^"]*flash-alert[^"]*"[^>]*>([^<]+)/)
                if (errorMatch) {
                    this.showError(errorMatch[1])
                } else {
                    this.showError(this.mode === "login" ? '邮箱或密码错误' : '注册失败，请检查输入信息')
                }
            }
        } catch (e) {
            console.error("[AuthModal] 解析错误响应失败:", e)
            this.showError('请求失败，请重试')
        }
    }

    // ============================================
    // Turbo Stream 降级处理
    // ============================================

    /**
     * 手动处理Turbo Stream（降级方案）
     * @param {string} html - Turbo Stream HTML字符串
     *
     * 当Turbo.renderStreamMessage不可用时，手动解析并执行stream操作
     */
    processTurboStreamManually(html) {
        // 创建临时容器解析HTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html

        // 查找所有turbo-stream元素
        const streamElements = tempDiv.querySelectorAll('turbo-stream')

        streamElements.forEach(el => {
            const target = el.getAttribute('target')
            const action = el.getAttribute('action')
            const template = el.querySelector('template')

            if (target && action && template) {
                const targetEl = document.getElementById(target)

                if (targetEl) {
                    const content = template.innerHTML

                    // 使用requestAnimationFrame确保更新在下一帧执行
                    requestAnimationFrame(() => {
                        switch (action) {
                            case 'replace':
                                targetEl.outerHTML = content
                                break
                            case 'append':
                                targetEl.insertAdjacentHTML('beforeend', content)
                                break
                            case 'prepend':
                                targetEl.insertAdjacentHTML('afterbegin', content)
                                break
                            case 'remove':
                                targetEl.remove()
                                break
                            case 'update':
                                targetEl.innerHTML = content
                                break
                        }
                    })
                }
            }
        })

        // 清理临时元素
        tempDiv.remove()
    }

    // ============================================
    // 消息提示
    // ============================================

    /**
     * 显示错误消息
     * @param {string} message - 错误消息文本
     */
    showError(message) {
        if (this.hasErrorMessageTarget && this.hasErrorTextTarget) {
            this.errorTextTarget.textContent = message
            this.errorMessageTarget.style.display = 'block'
        }
    }

    /**
     * 隐藏错误消息
     */
    hideError() {
        if (this.hasErrorMessageTarget) {
            this.errorMessageTarget.style.display = 'none'
        }
    }

    /**
     * 翻译错误消息为友好的中文
     * @param {string} message - 原始错误消息
     * @returns {string} 翻译后的友好错误消息
     */
    translateErrorMessage(message) {
        // Rails 验证错误的中文映射
        const errorTranslations = {
            'Email has already been taken': '该邮箱已被注册，请直接登录或使用其他邮箱',
            'Email 格式不正确': '请输入正确的邮箱地址',
            'Email 已被使用': '该邮箱已被注册，请直接登录或使用其他邮箱',
            'Password is too short': '密码太短，至少需要6个字符',
            'Password 太短': '密码太短，至少需要6个字符',
            'Password confirmation doesn\'t match Password': '两次输入的密码不一致',
            'Password confirmation 与密码不匹配': '两次输入的密码不一致',
            'Password can\'t be blank': '请输入密码',
            'Email can\'t be blank': '请输入邮箱地址'
        }

        // 尝试匹配完整错误消息
        if (errorTranslations[message]) {
            return errorTranslations[message]
        }

        // 尝试部分匹配
        for (const [key, value] of Object.entries(errorTranslations)) {
            if (message.includes(key.replace('Email ', '').replace('Password ', ''))) {
                return value
            }
        }

        // 如果没有匹配，返回原始消息
        return message
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息文本
     *
     * 在屏幕中央显示一个自动消失的提示框
     */
    showToast(message) {
        // 创建toast元素
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

        // 2秒后自动移除
        setTimeout(() => {
            toast.remove()
            style.remove()
        }, 2000)
    }
}
