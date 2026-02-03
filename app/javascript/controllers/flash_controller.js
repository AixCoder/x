import { Controller } from "@hotwired/stimulus"

/**
 * FlashController - Flash消息自动消失控制器
 *
 * 功能说明：
 * 页面加载后3秒自动淡出并移除flash消息
 */
export default class extends Controller {
    connect() {
        // 3秒后开始消失动画
        setTimeout(() => {
            this.dismiss()
        }, 3000)
    }

    dismiss() {
        // 添加淡出动画
        this.element.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
        this.element.style.opacity = '0'
        this.element.style.transform = 'translateY(-20px)'

        // 动画完成后从DOM移除
        setTimeout(() => {
            this.element.remove()
        }, 500)
    }
}
