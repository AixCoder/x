class SharedQuote < ApplicationRecord
  belongs_to :user

  # 生成唯一令牌前自动设置过期时间
  before_create :generate_token, :set_expiration

  # 默认访问次数为0
  after_initialize :set_defaults, if: :new_record?

  # 检查是否过期
  def expired?
    expires_at < Time.current
  end

  # 增加访问次数
  def increment_access!
    increment!(:accessed_count)
  end

  private

  def set_defaults
    self.accessed_count ||= 0
  end

  # 生成唯一的随机令牌
  def generate_token
    self.token = loop do
      random_token = SecureRandom.urlsafe_base64(16)
      break random_token unless self.class.exists?(token: random_token)
    end
  end

  # 设置过期时间为1个月后
  def set_expiration
    self.expires_at = 1.month.from_now
  end
end
