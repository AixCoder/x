import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["heart", "catPopup", "bubbleText"]

    connect() {
        this.isLiked = false
    }

    toggle(e) {
        if (e) e.preventDefault()

        this.isLiked = !this.isLiked

        if (this.isLiked) {
            this.heartTarget.classList.add("is-liked")
            this.showCat()
        } else {
            this.heartTarget.classList.remove("is-liked")
            this.hideCat()
        }
    }

    showCat() {
        // Clear any existing hide timer to prevent premature closing
        if (this.hideTimer) clearTimeout(this.hideTimer)

        // Reset text to default prompting state
        this.resetText()

        this.catPopupTarget.classList.add("is-visible")

        // Auto hide after 5 seconds if no interaction
        this.hideTimer = setTimeout(() => {
            this.hideCat()
        }, 5000)
    }

    hideCat() {
        this.catPopupTarget.classList.remove("is-visible")
    }

    copy(e) {
        if (e) e.preventDefault()
        e.stopPropagation()

        // Important: Clear the 5s auto-hide timer so the user has time to see the "Copied" message
        if (this.hideTimer) clearTimeout(this.hideTimer)

        navigator.clipboard.writeText(window.location.href).then(() => {
            // Show feedback
            this.bubbleTextTarget.innerHTML = `
        <span style="display:flex; align-items:center; color:#059669;">
          <svg style="width:14px; height:14px; margin-right:4px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"></path></svg>
          已复制到剪贴板
        </span>
      `

            // Close shortly after showing success message
            setTimeout(() => {
                this.hideCat()
            }, 2000)
        })
    }

    resetText() {
        // Note: The styling for this is handled in CSS (Serif font)
        this.bubbleTextTarget.innerHTML = `
      喜欢就分享，点击复制链接 <span style="opacity:0.6; margin-left:2px; font-style: normal;">🔗</span>
    `
    }
}
