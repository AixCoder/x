class HomeController < ApplicationController
  # 定义所有名言，每个有一个唯一 ID
  QUOTES = {
    1 => "花中樱花，人中武士",
    2 => "世事无常，转瞬即逝",
    3 => "静心是一切美的源泉"
  }.freeze

  helper_method :sharer_display_name

  def index
    # 如果有分享 ID，显示对应名言，否则随机
    if params[:quote_id].present? && QUOTES[params[:quote_id].to_i]
      @quote_id = params[:quote_id].to_i
      @quote = QUOTES[@quote_id]
    else
      @quote_id = QUOTES.keys.sample
      @quote = QUOTES[@quote_id]
    end
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

  # API: 创建分享链接
  def create_share
    # 需要登录
    unless logged_in?
      render json: { error: "请先登录" }, status: :unauthorized
      return
    end

    quote_id = params[:quote_id].to_i

    # 验证 quote_id 是否有效
    unless QUOTES.key?(quote_id)
      render json: { error: "无效的名言" }, status: :unprocessable_entity
      return
    end

    # 创建分享记录
    shared_quote = SharedQuote.create!(
      quote_id: quote_id,
      user: current_user
    )

    # 返回分享链接
    render json: {
      token: shared_quote.token,
      url: share_url(token: shared_quote.token),
      expires_at: shared_quote.expires_at.strftime("%Y-%m-%d %H:%M")
    }
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
