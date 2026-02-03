class ApplicationController < ActionController::Base
  # 只允许现代浏览器
  # allow_browser versions: :modern

  # 启用CSRF保护（Rails默认启用）
  # :exception 模式会在CSRF验证失败时抛出异常
  # :null_session 模式会清空会话（更温和）
  protect_from_forgery with: :exception, prepend: true

  # 确保 API 请求返回 JSON 格式的错误
  rescue_from ActionController::InvalidAuthenticityToken do |exception|
    Rails.logger.error "CSRF验证失败: #{exception.message}"
    respond_to do |format|
      format.json { render json: { error: "安全验证失败，请刷新页面重试" }, status: :unprocessable_entity }
      format.html { redirect_to root_path, alert: "安全验证失败，请刷新页面重试" }
    end
  end

  # ============================================
  # 用户认证相关辅助方法
  # ============================================
  # 这些方法可以在所有控制器和视图中使用

  # 让以下方法在视图中可用（辅助方法）
  helper_method :current_user, :logged_in?

  private

  # --------------------------------------------
  # 获取当前登录用户
  # --------------------------------------------
  # 如果用户已登录，返回 User 对象
  # 如果未登录，返回 nil
  #
  # 使用技巧：
  # - current_user 只在第一次调用时查询数据库
  # - 结果被 @current_user 缓存，后续调用直接返回
  # - 这叫"记忆化"(memoization)，避免重复查询
  #
  # iOS Safari 兼容性说明：
  # iOS Safari 在浏览器关闭后会清除 session cookie
  # 所以我们同时检查 remember me cookie，实现持久登录
  def current_user
    # 如果 @current_user 已经设置，直接返回
    return @current_user if defined?(@current_user)

    # 首先尝试从 session 获取用户 ID
    user_id = session[:user_id]

    # 如果 session 中没有，尝试从 remember me cookie 获取
    # signed cookie 会自动验证签名，防止篡改
    if user_id.nil?
      user_id = cookies.signed[:user_id]
      # 如果 remember me cookie 有效，恢复 session
      if user_id
        session[:user_id] = user_id
      end
    end

    @current_user = User.find_by(id: user_id)
  end

  # --------------------------------------------
  # 检查用户是否已登录
  # --------------------------------------------
  # 返回 true 或 false
  # 在视图中用于条件渲染（显示登录/登出按钮）
  def logged_in?
    # !! 将值转换为布尔值
    # current_user 返回对象或 nil
    # !!nil => false, !!object => true
    !!current_user
  end

  # --------------------------------------------
  # 要求用户必须登录
  # --------------------------------------------
  # 用于保护需要登录才能访问的页面
  # 用法：before_action :authenticate_user!
  def authenticate_user!
    unless logged_in?
      # 保存用户想要访问的 URL，登录后可以跳转回来
      session[:return_to] = request.fullpath

      flash[:alert] = "请先登录"
      redirect_to login_path
    end
  end

  # --------------------------------------------
  # 要求用户必须未登录（用于登录/注册页面）
  # --------------------------------------------
  # 防止已登录用户重复登录
  # 用法：before_action :require_no_user
  def require_no_user
    if logged_in?
      redirect_to root_path, notice: "您已经登录了"
    end
  end

  # --------------------------------------------
  # 获取导航栏部分（用于 AJAX 更新）
  # --------------------------------------------
  def nav_bar
    render partial: "shared/nav_bar", layout: false
  end
end
