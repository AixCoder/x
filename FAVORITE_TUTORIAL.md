# ❤️ 收藏功能教程 - 使用 Stimulus 添加红心按钮

欢迎继续学习！现在我们要添加一个收藏功能，让用户可以点击红心按钮收藏喜欢的名言。

---

## 📚 第一步：理解 Stimulus 框架

### 什么是 Stimulus？

Stimulus 是 Rails 7 默认的 JavaScript 框架，它是 **Hotwire** 的一部分。

**Stimulus 的设计哲学**：
- **轻量级**：不需要复杂的构建工具
- **约定优于配置**：遵循约定，代码更清晰
- **HTML 为中心**：在 HTML 中直接绑定行为，不需要复杂的虚拟 DOM
- **渐进增强**：即使 JavaScript 失败，页面仍然可用

### Stimulus 的核心概念

1. **控制器（Controller）**：JavaScript 类，包含页面的交互逻辑
2. **目标（Target）**：控制器需要操作的 HTML 元素
3. **动作（Action）**：用户交互时触发的方法
4. **数据属性（Data Attributes）**：在 HTML 中连接控制器和元素

---

## 🎯 第二步：创建 Stimulus 控制器

### 步骤 2.1：理解文件结构

在 Rails 7 中，Stimulus 控制器文件位于：
```
app/javascript/controllers/
```

**命名约定**：
- 文件名：`favorite_controller.js`（小写，下划线分隔，以 `_controller.js` 结尾）
- 类名：`FavoriteController`（首字母大写，驼峰命名）

### 步骤 2.2：创建控制器文件

你需要创建一个新文件：
```
app/javascript/controllers/favorite_controller.js
```

**文件的基本结构**：

```javascript
import { Controller } from "@hotwired/stimulus"

export default class FavoriteController extends Controller {
  // 这里写你的代码
}
```

**解释**：
- `import { Controller }`：从 Stimulus 导入基础 Controller 类
- `export default class`：导出这个类，让 Stimulus 可以自动注册它
- `extends Controller`：继承 Stimulus 的 Controller 基类

---

## 🎨 第三步：在 HTML 中添加红心按钮

### 步骤 3.1：理解数据属性

Stimulus 使用 `data-` 属性来连接 HTML 和 JavaScript：

- `data-controller="favorite"`：告诉 Stimulus 这个元素使用 `favorite` 控制器
- `data-favorite-target="button"`：定义一个目标，可以在控制器中访问
- `data-action="click->favorite#toggle"`：绑定点击事件到控制器的 `toggle` 方法

### 步骤 3.2：在视图中添加按钮

打开 `app/views/home/index.html.erb`，在名言卡片中添加红心按钮。

**按钮应该放在哪里？**

建议放在 `quote-card` div 内部，可以在名言文本下方，或者右上角。

**HTML 结构示例**：

```erb
<div class="quote-card" data-controller="favorite">
  <!-- 名言内容 -->
  <h1 class="quote-text"><%= @quotes %></h1>
  
  <!-- 红心按钮 -->
  <button 
    type="button" 
    class="heart-button"
    data-favorite-target="button"
    data-action="click->favorite#toggle"
    aria-label="收藏这条名言">
    <!-- 这里放红心图标 -->
  </button>
  
  <p class="quote-subtitle">日本文学名言</p>
</div>
```

**解释每个属性**：
- `data-controller="favorite"`：激活 `favorite` 控制器
- `data-favorite-target="button"`：将这个按钮定义为 `button` 目标
- `data-action="click->favorite#toggle"`：点击时调用控制器的 `toggle` 方法
- `aria-label`：无障碍访问标签

---

## 💡 第四步：实现点击事件逻辑

### 步骤 4.1：定义目标（Target）

在控制器中，你需要定义目标：

```javascript
static targets = ["button"]
```

**解释**：
- `static targets`：定义这个控制器可以访问的目标元素
- `["button"]`：定义一个名为 `button` 的目标
- 之后可以用 `this.buttonTarget` 访问这个元素

### 步骤 4.2：定义动作方法（Action）

创建一个 `toggle` 方法来处理点击事件：

```javascript
toggle() {
  // 这里写切换收藏状态的逻辑
}
```

**方法命名**：
- 方法名 `toggle` 对应 `data-action` 中的 `toggle`
- Stimulus 会自动将点击事件绑定到这个方法

### 步骤 4.3：切换红心状态

你需要：
1. 检查当前是否已收藏
2. 切换收藏状态
3. 更新按钮的视觉状态（空心/实心）

**思路**：
- 使用 CSS 类来区分收藏和未收藏状态
- 例如：`favorited` 类表示已收藏
- 切换时添加或移除这个类

---

## 🎨 第五步：设计红心按钮样式

### 步骤 5.1：选择图标方式

你有几个选择：

1. **使用 Unicode 字符**：❤️（实心）和 🤍（空心）
2. **使用 SVG**：更灵活，可以自定义颜色和大小
3. **使用 CSS 绘制**：用 CSS 画一个心形

**推荐**：使用 Unicode 字符，最简单直接。

### 步骤 5.2：添加 CSS 样式

在 `app/assets/stylesheets/application.css` 中添加按钮样式。

**需要考虑的样式**：
- 按钮大小和位置
- 未收藏状态（空心红心）
- 已收藏状态（实心红心）
- 悬停效果
- 点击动画效果

**CSS 类命名建议**：
- `.heart-button`：基础按钮样式
- `.heart-button.favorited`：已收藏状态的样式

---

## 💾 第六步：存储收藏状态

### 步骤 6.1：选择存储方式

有两种方式：

1. **localStorage（浏览器本地存储）**
   - 优点：简单，不需要后端
   - 缺点：只存在当前浏览器，换设备就没了
   - 适合：快速原型和学习

2. **数据库存储**
   - 优点：永久保存，跨设备同步
   - 缺点：需要后端 API，更复杂
   - 适合：生产环境

**学习阶段建议**：先用 localStorage，理解原理后再考虑数据库。

### 步骤 6.2：使用 localStorage

localStorage 是浏览器提供的本地存储 API。

**基本操作**：
- `localStorage.setItem('key', 'value')`：保存数据
- `localStorage.getItem('key')`：读取数据
- `localStorage.removeItem('key')`：删除数据

**存储策略**：
- 可以用名言文本作为 key
- 或者用名言数组，存储所有收藏的名言

---

## 🔄 第七步：实现完整的交互流程

### 流程梳理

1. **页面加载时**：
   - 检查这条名言是否已收藏
   - 如果是，显示实心红心
   - 如果不是，显示空心红心

2. **点击按钮时**：
   - 切换收藏状态
   - 更新按钮外观
   - 保存到 localStorage

3. **状态切换**：
   - 未收藏 → 已收藏：添加 `favorited` 类，保存到 localStorage
   - 已收藏 → 未收藏：移除 `favorited` 类，从 localStorage 删除

### 控制器方法结构

```javascript
// 连接时执行（页面加载时）
connect() {
  // 检查是否已收藏，更新按钮状态
}

// 切换收藏状态
toggle() {
  // 切换收藏状态
  // 更新按钮外观
  // 保存/删除 localStorage
}

// 检查是否已收藏（辅助方法）
isFavorited() {
  // 从 localStorage 读取，返回 true/false
}

// 保存收藏状态（辅助方法）
saveFavorite() {
  // 保存到 localStorage
}

// 删除收藏状态（辅助方法）
removeFavorite() {
  // 从 localStorage 删除
}
```

---

## 🎯 第八步：获取当前名言文本

### 问题：如何知道当前显示的是哪条名言？

在控制器中，你需要获取当前显示的名言文本，这样才能：
- 检查这条名言是否已收藏
- 保存时知道保存的是哪条名言

### 解决方案

**方法 1：使用数据属性传递**

在 HTML 中：
```erb
<div class="quote-card" 
     data-controller="favorite"
     data-favorite-quote-value="<%= @quotes %>">
```

在控制器中：
```javascript
static values = { quote: String }

// 访问：this.quoteValue
```

**方法 2：从 DOM 元素读取**

在控制器中：
```javascript
// 获取名言文本元素
const quoteText = this.element.querySelector('.quote-text')
const quote = quoteText.textContent.trim()
```

**推荐**：使用方法 1（数据属性），更符合 Stimulus 的约定。

---

## 📝 第九步：代码组织建议

### 控制器代码结构

```javascript
import { Controller } from "@hotwired/stimulus"

export default class FavoriteController extends Controller {
  // 1. 定义目标和值
  static targets = ["button"]
  static values = { quote: String }
  
  // 2. 连接时执行（页面加载）
  connect() {
    // 初始化逻辑
  }
  
  // 3. 主要动作方法
  toggle() {
    // 切换收藏状态
  }
  
  // 4. 辅助方法（私有方法，不对外暴露）
  isFavorited() {
    // 检查是否已收藏
  }
  
  saveFavorite() {
    // 保存收藏
  }
  
  removeFavorite() {
    // 删除收藏
  }
  
  updateButtonState(isFavorited) {
    // 更新按钮的视觉状态
  }
}
```

---

## 🎨 第十步：完善用户体验

### 添加视觉反馈

1. **点击动画**：
   - 点击时按钮稍微放大
   - 使用 CSS `transform: scale()`

2. **过渡效果**：
   - 状态切换时平滑过渡
   - 使用 CSS `transition`

3. **提示信息**（可选）：
   - 收藏成功时显示提示
   - 可以使用简单的 alert 或更优雅的 toast 提示

---

## 🧪 第十一步：测试你的代码

### 测试清单

1. ✅ 页面加载时，按钮显示正确的初始状态
2. ✅ 点击按钮，状态正确切换
3. ✅ 刷新页面，收藏状态保持（localStorage 生效）
4. ✅ 切换不同的名言，每条名言的收藏状态独立
5. ✅ 按钮样式在不同状态下正确显示

### 调试技巧

1. **使用浏览器控制台**：
   - 打开开发者工具（F12）
   - 在 Console 中查看错误信息

2. **使用 console.log**：
   ```javascript
   toggle() {
     console.log('点击了按钮')
     console.log('当前状态：', this.isFavorited())
   }
   ```

3. **检查 localStorage**：
   - 在开发者工具的 Application → Local Storage 中查看存储的数据

---

## 💡 Stimulus 核心概念总结

### 数据属性速查表

| 属性 | 作用 | 示例 |
|------|------|------|
| `data-controller` | 激活控制器 | `data-controller="favorite"` |
| `data-{controller}-target` | 定义目标 | `data-favorite-target="button"` |
| `data-action` | 绑定事件 | `data-action="click->favorite#toggle"` |
| `data-{controller}-{name}-value` | 传递值 | `data-favorite-quote-value="名言"` |

### 控制器中的访问方式

| 在 HTML 中 | 在控制器中访问 |
|------------|----------------|
| `data-controller="favorite"` | `this.element`（整个元素） |
| `data-favorite-target="button"` | `this.buttonTarget` |
| `data-action="click->favorite#toggle"` | `toggle()` 方法 |
| `data-favorite-quote-value="..."` | `this.quoteValue` |

---

## 🎓 学习要点

1. **Stimulus 的约定**：
   - 文件名和控制器名的对应关系
   - 数据属性的命名规则

2. **事件绑定**：
   - `data-action` 的语法：`事件名->控制器名#方法名`

3. **状态管理**：
   - 使用 CSS 类表示状态
   - 使用 localStorage 持久化状态

4. **代码组织**：
   - 将逻辑拆分成小方法
   - 每个方法只做一件事

---

## 🚀 下一步建议

完成收藏功能后，你可以尝试：

1. **收藏列表页面**：显示所有收藏的名言
2. **分享功能**：分享喜欢的名言
3. **分类功能**：按主题分类名言
4. **数据库存储**：将 localStorage 改为数据库存储

---

## 📚 参考资源

- **Stimulus 官方文档**：https://stimulus.hotwired.dev/
- **Rails 7 指南**：https://guides.rubyonrails.org/
- **MDN localStorage**：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage

---

记住：编程是一个渐进的过程。先让功能跑起来，再慢慢优化和完善。每一步都是学习的机会！

祝你编程愉快！❤️
