class User < ApplicationRecord
  # has_secure_password 是 Rails 提供的方法，用于处理密码加密
  # 它会自动处理 password_digest 字段，并提供 password 和 password_confirmation 虚拟属性
  # 同时提供 authenticate 方法用于验证密码
  has_secure_password

  # 邮箱验证
  # presence: true - 确保邮箱不为空
  # uniqueness: { case_sensitive: false } - 邮箱不区分大小写唯一
  # format: { with: URI::MailTo::EMAIL_REGEXP } - 使用 Ruby 内置的正则验证邮箱格式
  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP, message: "格式不正确" }

  # 密码验证（只在创建时验证，更新时可以留空表示不修改密码）
  # length: { minimum: 6 } - 密码最少6位
  validates :password, length: { minimum: 6 }, if: -> { password.present? }
end
