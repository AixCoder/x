# SessionsController 处理用户登录和登出
# Session（会话）是 Web 开发中的概念，用于在多个请求之间保持用户状态
# Rails 使用加密的 Cookie 来存储 session 数据
class SessionsController < ApplicationController
  # 如果用户已登录，自动跳转到首页
  # 避免已登录用户再次访问登录页面
  # 注意：AJAX/Turbo Stream 请求不重定向，只处理 HTML 请求
  before_action :redirect_if_logged_in, only: [:new, :create]

  # GET /login
  # 显示登录表单
  # 对应视图: app/views/sessions/new.html.erb
  def new
    # @user 用于 form_with 辅助方法
    # 这里我们只是创建一个空对象，不实际使用它
    @user = User.new
  end

  # GET /login/simple
  # 显示极简登录表单（从播放页面跳转）
  # 登录成功后返回播放页面，不打断音频
  def simple
    # 极简登录页面，不需要额外数据
    render :simple
  end

  # POST /login
  # 处理登录表单提交
  # 验证邮箱和密码，成功后创建 session
  def create
    # 1. 获取表单参数（支持两种格式：session[email] 或直接 email）
    email = session_params[:email]&.downcase
    password = session_params[:password]

    # 2. 查找用户：通过邮箱查找（不区分大小写）
    user = User.find_by(email: email)

    # 3. 验证用户存在且密码正确
    if user&.authenticate(password)
      # 登录成功
      session[:user_id] = user.id

      # 处理"记住我"功能
      if params[:session]&.[](:remember_me) == "1"
        cookies.signed[:user_id] = {
          value: user.id,
          expires: 30.days,
          httponly: true,
          secure: Rails.env.production?
        }
      end

      flash[:notice] = "欢迎回来，#{user.nickname.presence || user.email}！"

      # 响应不同格式请求
      respond_to do |format|
        # JSON API 响应（轻量模式）- 包含导航栏HTML用于前端更新
        format.json {
          render json: {
            success: true,
            message: "登录成功",
            user: {
              id: user.id,
              email: user.email,
              nickname: user.nickname
            },
            nav_bar_html: render_to_string(partial: "shared/nav_bar", layout: false, formats: [:html]),
            flash_html: render_to_string(partial: "shared/flash_messages", layout: false, formats: [:html])
          }
        }
        format.turbo_stream do
          # 返回 Turbo Stream 更新导航栏
          render turbo_stream: [
            turbo_stream.replace("nav-bar", partial: "shared/nav_bar"),
            turbo_stream.append("flash-container", partial: "shared/flash")
          ]
        end
        format.html { redirect_to root_path }
      end
    else
      # 登录失败
      flash.now[:alert] = "邮箱或密码错误"

      respond_to do |format|
        format.json { render json: { success: false, error: "邮箱或密码错误" }, status: :unauthorized }
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /logout
  # 处理登出
  # 清除 session 和 remember me cookie
  def destroy
    # 清除 session 中的 user_id
    session[:user_id] = nil

    # 清除 remember me cookie
    cookies.delete(:user_id)

    # 可选：清除整个 session
    # reset_session

    flash[:notice] = "已成功登出"
    redirect_to root_path
  end

  private

  # 私有方法：如果用户已登录，重定向到首页
  # 跳过 AJAX/Turbo Stream 请求，只在 HTML 请求时重定向
  def redirect_if_logged_in
    return if request.xhr? || request.format.turbo_stream?

    if current_user
      redirect_to root_path, notice: "您已经登录了"
    end
  end

  # Strong Parameters：只允许特定参数通过
  # 这是 Rails 的安全特性，防止恶意用户注入其他参数
  def session_params
    params.require(:session).permit(:email, :password, :remember_me)
  rescue ActionController::ParameterMissing
    # 如果没有 session 参数，尝试直接从 params 获取
    { email: params[:email], password: params[:password] }
  end
end
