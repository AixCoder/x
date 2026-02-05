class HomeController < ApplicationController
  # 定义所有名言，每个有一个唯一 ID
  QUOTES = {
    1 => "花中樱花，人中武士",
    2 => "世事无常，转瞬即逝",
    3 => "静心是一切美的源泉",
    4 => "风中燃尽",
    5 => "嘻嘻哈哈",
    6 => "春夏秋冬"
  }.freeze

  helper_method :sharer_display_name

  def index

      # 新访问，随机选择
      @quote_id = QUOTES.keys.sample
      @quote = QUOTES[@quote_id]
      # 保存到 session
      session[:current_quote_id] = @quote_id
  end
  
  # 登录页面：使用 shared/auth_modal partial
  def login
    # login.html.erb 会渲染 shared/auth_modal partial
  end

  # 关于页面
  def about

  end

  # 红心列表页面
  def favorites
  end

  # 分享页面
  def share
    # 通过 token 查找分享记录
    @shared_quote = SharedQuote.find_by(token: params[:token])

    if @shared_quote.nil?
      # Token 不存在，显示随机名言
      @quote_id = QUOTES.keys.sample
      @quote = QUOTES[@quote_id]
      @sharer = nil
      @expired = false
      return
    end

    # 增加访问次数
    @shared_quote.increment_access!

    # 检查是否过期
    if @shared_quote.expired?
      # 过期了，显示随机名言，不显示分享者
      @quote_id = QUOTES.keys.sample
      @quote = QUOTES[@quote_id]
      @sharer = nil
      @expired = true
      @expired_at = @shared_quote.expires_at
    else
      # 未过期，显示分享的名言和分享者
      @quote_id = @shared_quote.quote_id
      @quote = QUOTES[@quote_id]
      @sharer = @shared_quote.user
      @expired = false
    end
  end

  # ============================================
  # API: 创建分享链接
  # ============================================
  # 端点：POST /api/create_share
  # 功能：创建名言分享记录，返回分享链接
  #
  # 请求参数：
  # - quote_id: integer (可选，默认为1) - 要分享的名言ID
  #
  # 响应格式：JSON
  # 成功：{ token: string, url: string, expires_at: string }
  # 失败：{ error: string }
  #
  # 特性：
  # 1. 支持匿名分享 - 未登录用户也可创建分享链接
  # 2. 自动关联用户 - 已登录用户的分享会记录用户ID
  # 3. 错误处理 - 捕获所有异常并返回JSON格式错误
  #
  # 错误处理改进历程：
  # - 最初问题：CSRF验证失败时返回HTML错误页面，导致前端JSON解析失败
  # - 解决方案：在 ApplicationController 中添加 rescue_from 处理 CSRF 错误
  # - 当前方案：所有错误统一返回 JSON 格式，包含详细的错误信息
  def create_share
    # 转换参数为整数
    quote_id = params[:quote_id].to_i

    # 验证 quote_id 是否在有效范围内
    # QUOTES 是定义在控制器顶部的常量，包含所有名言
    unless QUOTES.key?(quote_id)
      render json: { error: "无效的名言" }, status: :unprocessable_entity
      return
    end

    # 创建分享记录
    # - 已登录用户：关联当前用户
    # - 未登录用户：user 设为 nil，创建匿名分享
    # 使用 create! 在验证失败时抛出异常，被 rescue 捕获
    shared_quote = SharedQuote.create!(
      quote_id: quote_id,
      user: logged_in? ? current_user : nil
    )

    # 返回成功响应
    # - token: 分享令牌，用于构建分享链接
    # - url: 完整的分享链接URL（包含域名）
    # - expires_at: 过期时间，格式化为 "YYYY-MM-DD HH:MM"
    render json: {
      token: shared_quote.token,
      url: share_url(token: shared_quote.token),
      expires_at: shared_quote.expires_at.strftime("%Y-%m-%d %H:%M")
    }

  # 全局异常捕获
  # 捕获所有 StandardError 子类异常，确保始终返回 JSON 格式
  # 记录详细错误日志，方便排查问题
  rescue StandardError => e
    Rails.logger.error "创建分享链接失败: #{e.message}"
    Rails.logger.error e.backtrace.first(5).join("\n")
    render json: { error: "创建分享链接失败: #{e.message}" }, status: :internal_server_error
  end

  private

  # 辅助方法：显示分享者名称
  def sharer_display_name
    return "来自朋友的分享" unless @sharer.present?

    display_name = @sharer.nickname.presence || @sharer.email
    "来自朋友（#{display_name}）"
  end

  # 辅助方法：显示过期日期
  def expired_date
    return nil unless @expired_at.present?
    @expired_at.strftime("%Y年%m月%d日")
  end
end
