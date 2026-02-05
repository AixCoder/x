Rails.application.routes.draw do
  # ============================================
  # 根路由 - 首页
  # ============================================
  root "home#index"

  # ============================================
  # 页面路由
  # ============================================
  get "home/index"
  get "about", to: "home#about", as: :about
  get "favorites", to: "home#favorites", as: :favorites
  get "player", to: "player#index", as: :player
  # 分享链接（使用 token）
  # 分享链接（使用 token）
  get "share/:token", to: "home#share", as: :share

  # API: 创建分享
  post "api/create_share", to: "home#create_share"

  get "test_auth_modal", to: "home#login"

  # ============================================
  # 用户认证路由 (登录/登出)
  # ============================================
  # rails routes | grep session 检测路由
  # 登录页面（显示表单）
  get "login", to: "sessions#new", as: :login
  # 处理登录表单提交
  post "login", to: "sessions#create"
  # 登出
  delete "logout", to: "sessions#destroy", as: :logout
  # 也支持 GET 方式的登出（方便开发测试）
  get "logout", to: "sessions#destroy"
  # 极简登录页面（从播放页面跳转）
  get "login/simple", to: "sessions#simple", as: :simple_login


  # ============================================
  # 用户注册路由
  # ============================================
  # 注册页面
  get "signup", to: "users#new", as: :signup

  # 处理注册表单提交
  post "signup", to: "users#create"

  # 用户资料编辑
  get "profile", to: "users#edit", as: :profile
  patch "profile", to: "users#update"

  # ============================================
  # RESTful 资源路由
  # ============================================
  # 用户资源（除了 new 和 create 我们已经自定义了）
  resources :users, except: [:new, :create]

  # ============================================
  # 系统路由
  # ============================================
  # 获取导航栏部分（用于 AJAX 更新）
  get "shared/nav_bar", to: "application#nav_bar"

  # 健康检查
  get "up" => "rails/health#show", as: :rails_health_check

  # PWA 文件
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
end
