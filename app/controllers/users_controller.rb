# UsersController - 处理用户注册和资料编辑
#
# 路由：
#   GET  /signup  -> new   (显示注册表单)
#   POST /signup  -> create (处理注册)
#   GET  /profile -> edit   (显示编辑资料页面)
#   PATCH /profile -> update (更新用户资料)
#
class UsersController < ApplicationController
  # 如果用户已登录，不允许访问注册页面
  before_action :require_no_user, only: [:new, :create]
  # 只有登录用户才能编辑资料
  before_action :require_user, only: [:edit, :update]
  # 只能编辑自己的资料
  before_action :set_current_user, only: [:edit, :update]

  # GET /signup
  # 显示注册表单
  def new
    @user = User.new
  end

  # POST /signup
  # 处理注册表单提交
  #
  # 支持两种响应格式：
  # 1. HTML: 传统表单提交，重定向到首页
  # 2. Turbo Stream: AJAX提交，无刷新更新页面（用于模态框）
  #
  def create
    Rails.logger.debug "[UsersController#create] 接收到的参数: #{params.inspect}"
    Rails.logger.debug "[UsersController#create] user参数: #{params[:user].inspect}"

    @user = User.new(user_params)
    Rails.logger.debug "[UsersController#create] 创建的用户对象: #{@user.inspect}"

    if @user.save
      # 注册成功，自动登录
      session[:user_id] = @user.id
      flash[:notice] = "欢迎加入！注册成功！"

      respond_to do |format|
        # JSON API 响应（轻量模式）- 包含导航栏HTML用于前端更新
        format.json {
          render json: {
            success: true,
            message: "欢迎加入！注册成功！",
            user: {
              id: @user.id,
              email: @user.email,
              nickname: @user.nickname
            },
            nav_bar_html: render_to_string(partial: "shared/nav_bar", layout: false, formats: [:html]),
            flash_html: render_to_string(partial: "shared/flash_messages", layout: false, formats: [:html])
          }
        }
        format.html { redirect_to root_path }
        format.turbo_stream {
          # 返回Turbo Stream响应，更新导航栏和关闭模态框
          render turbo_stream: [
            # 更新导航栏显示登录状态
            turbo_stream.replace("nav-bar", partial: "shared/nav_bar"),
            # 发送成功消息到flash容器
            turbo_stream.replace("flash-container", partial: "shared/flash_messages")
          ]
        }
      end
    else
      # 注册失败，显示错误信息
      flash.now[:alert] = @user.errors.full_messages.join("，")
      Rails.logger.debug "[UsersController#create] 保存失败，错误: #{@user.errors.full_messages}"

      respond_to do |format|
        format.html { render :new, status: :unprocessable_entity }
        format.turbo_stream {
          # 返回错误提示
          render turbo_stream: [
            turbo_stream.replace("flash-container", partial: "shared/flash_messages")
          ], status: :unprocessable_entity
        }
        format.json { render json: { error: @user.errors.full_messages.join("，") }, status: :unprocessable_entity }
      end
    end
  rescue ActionController::ParameterMissing => e
    Rails.logger.error "[UsersController#create] 参数缺失: #{e.message}"
    error_msg = "缺少必要的用户信息"

    respond_to do |format|
      format.html {
        flash.now[:alert] = error_msg
        @user = User.new
        render :new, status: :unprocessable_entity
      }
      format.turbo_stream {
        flash.now[:alert] = error_msg
        render turbo_stream: [
          turbo_stream.replace("flash-container", partial: "shared/flash_messages")
        ], status: :unprocessable_entity
      }
      format.json { render json: { error: error_msg }, status: :unprocessable_entity }
    end
  end

  # GET /profile
  # 显示编辑资料页面
  def edit
  end

  # PATCH /profile
  # 更新用户资料
  #
  # 特殊处理：如果密码为空，不更新密码
  #
  def update
    # 如果密码为空，不更新密码
    if user_params[:password].blank?
      update_params = user_params.except(:password, :password_confirmation)
    else
      update_params = user_params
    end

    if @user.update(update_params)
      flash[:notice] = "资料更新成功！"
      redirect_to root_path
    else
      flash.now[:alert] = @user.errors.full_messages.join("，")
      render :edit, status: :unprocessable_entity
    end
  end

  private

  # 设置当前用户
  # 用于编辑和更新操作，确保只能编辑自己的资料
  def set_current_user
    @user = current_user
  end

  # 确保用户已登录
  # 用于需要登录才能访问的页面
  def require_user
    unless logged_in?
      flash[:alert] = "请先登录"
      redirect_to root_path
    end
  end

  # Strong Parameters：只允许特定参数通过
  #
  # 允许的参数：
  #   - email: 邮箱地址
  #   - password: 密码（明文，会被加密存储）
  #   - password_confirmation: 密码确认（虚拟属性，用于验证）
  #   - nickname: 昵称（可选）
  #
  # 注意：password_confirmation 不是数据库字段，由 has_secure_password 使用
  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation, :nickname)
  end
end
