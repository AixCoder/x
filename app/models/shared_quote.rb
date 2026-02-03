# SharedQuote 模型 - 分享名言记录
# ============================================
# 功能说明：
# 本模型用于存储用户分享的名言记录，包含分享令牌、过期时间、访问次数等信息
#
# 核心特性：
# 1. 支持匿名分享 - user 字段可为 nil
# 2. 自动令牌生成 - 使用 SecureRandom 生成唯一分享链接
# 3. 自动过期机制 - 默认 30 天后过期
# 4. 访问统计 - 记录分享链接被访问的次数
#
# 数据库字段：
# - quote_id: integer - 名言 ID（对应 QUOTES 常量中的键）
# - user_id: integer - 分享者用户 ID（可为 nil 表示匿名分享）
# - token: string - 唯一分享令牌
# - expires_at: datetime - 过期时间
# - accessed_count: integer - 访问次数
#
# 关联关系：
# - belongs_to :user - 分享者（optional: true 支持匿名）
#
# 回调方法：
# - generate_token: 创建前自动生成唯一令牌
# - set_expiration: 创建前自动设置过期时间（30天后）
# - set_defaults: 初始化时设置默认访问次数为 0
class SharedQuote < ApplicationRecord
  # 关联关系
  # optional: true 允许 user_id 为 nil，支持匿名分享功能
  belongs_to :user, optional: true

  # 回调：创建前自动生成令牌和过期时间
  # 顺序很重要：先生成令牌，再设置过期时间
  before_create :generate_token, :set_expiration

  # 回调：新记录初始化时设置默认值
  # if: :new_record? 确保只在新建时执行，避免更新时重复设置
  after_initialize :set_defaults, if: :new_record?

  # ============================================
  # 实例方法
  # ============================================

  # 检查分享链接是否已过期
  # 比较逻辑：过期时间 < 当前时间
  # 返回：Boolean（true 表示已过期）
  def expired?
    expires_at < Time.current
  end

  # 增加访问次数
  # 使用 increment! 原子操作，避免并发问题
  # 该方法在 share 页面被访问时调用
  def increment_access!
    increment!(:accessed_count)
  end

  private

  # ============================================
  # 私有回调方法
  # ============================================

  # 设置默认值
  # 仅在 accessed_count 为 nil 时设置为 0
  # 使用 ||= 避免覆盖已有值
  def set_defaults
    self.accessed_count ||= 0
  end

  # 生成唯一随机令牌
  # 使用 SecureRandom.urlsafe_base64(16) 生成 32 字符的 URL 安全字符串
  # loop 循环确保令牌唯一性（极低的碰撞概率下可能重复）
  # 存储为字符串类型，用于构建分享链接 /share/:token
  def generate_token
    self.token = loop do
      random_token = SecureRandom.urlsafe_base64(16)
      break random_token unless self.class.exists?(token: random_token)
    end
  end

  # 设置过期时间
  # 默认 30 天后过期
  # 使用 1.month.from_now 自动处理月末日期计算
  def set_expiration
    self.expires_at = 1.month.from_now
  end
end
