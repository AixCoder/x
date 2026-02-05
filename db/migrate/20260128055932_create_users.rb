class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users do |t| #创建users表
      t.string :email, null: false  #创建email 列 字符串类型
      t.string :password_digest, null: false

      t.timestamps
    end

    # 为 email 添加唯一索引，确保邮箱不重复
    add_index :users, :email, unique: true
  end
end
