# PlayerController 处理播放页面
class PlayerController < ApplicationController
  # GET /player
  def index
    # 播放页面，可以在这里添加播放列表等数据
    @quotes = Quote.all.sample(5) if defined?(Quote)
  end
end
