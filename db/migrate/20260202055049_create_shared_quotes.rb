class CreateSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    create_table :shared_quotes do |t|
      t.integer :quote_id, null: false
      t.references :user, null: false, foreign_key: true
      t.string :token, null: false
      t.datetime :expires_at, null: false
      t.integer :accessed_count, default: 0

      t.timestamps
    end

    add_index :shared_quotes, :token, unique: true
    add_index :shared_quotes, :expires_at
  end
end
