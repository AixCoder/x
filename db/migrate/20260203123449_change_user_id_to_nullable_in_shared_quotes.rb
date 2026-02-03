class ChangeUserIdToNullableInSharedQuotes < ActiveRecord::Migration[7.2]
  def change
    change_column_null :shared_quotes, :user_id, true
  end
end
