# ============================================
# Session 存储配置
# ============================================
# Rails 默认使用 Cookie 存储 session 数据
# 这里配置 Cookie 的过期时间为 2 周，实现"记住登录状态"

Rails.application.config.session_store :cookie_store,
  key: '_peter_cat_session',           # Cookie 名称
  expire_after: 2.weeks,                # 过期时间：2周
  secure: Rails.env.production?,        # 生产环境只允许 HTTPS
  httponly: true,                       # 禁止 JavaScript 访问（安全）
  same_site: :lax                       # CSRF 保护级别

# 配置说明：
# - expire_after: 设置后，即使用户关闭浏览器，Cookie 也会保持直到过期
# - 如果不设置 expire_after，Cookie 是"会话级别"，关闭浏览器即删除
# - 2 weeks 是平衡安全性和便利性的合理值
