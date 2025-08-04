# 收藏夹图片显示问题分析报告

## 问题描述
用户报告收藏夹页面图片显示不正确，但购物车页面产品首图正常加载。

## 代码分析结果

### 1. 图片URL构建逻辑对比

**收藏夹页面 (`app/collection/page.tsx`)**:
```javascript
src={item.main_image?.data?.attributes?.url ? 
  (item.main_image.data.attributes.url.startsWith('http') ? 
    item.main_image.data.attributes.url : 
    `https://ambelie-backend-production.up.railway.app${item.main_image.data.attributes.url}`
  ) : '/placeholder.jpg'
}
```

**购物车页面 (`app/cart/page.tsx`)**:
```javascript
src={item.main_image?.data?.attributes?.url ? 
  (item.main_image.data.attributes.url.startsWith('http') ? 
    item.main_image.data.attributes.url : 
    `https://ambelie-backend-production.up.railway.app${item.main_image.data.attributes.url}`
  ) : '/placeholder.jpg'
}
```

**结论**: 两个页面的图片URL构建逻辑完全相同。

### 2. 数据来源差异分析

**购物车数据来源**:
- 本地添加时通过 `ProductDisplay` 组件构建完整的 `main_image` 数据结构
- 使用 `persist` 中间件进行本地存储
- 数据结构在添加时就已经标准化

**收藏夹数据来源**:
- 本地添加时通过 `ProductDisplay` 组件构建完整的 `main_image` 数据结构
- 从后端API (`/api/wishlist`) 加载时，依赖后端返回的数据结构
- 没有使用 `persist` 中间件，每次刷新都从后端重新加载

### 3. 后端API配置检查

**后端 `getWishlist` 方法的 populate 配置**:
```javascript
populate: {
  wishlist: {
    populate: {
      main_image: {
        populate: '*'
      },
      category: true
    }
  }
}
```

**后端 `syncWishlist` 方法的 populate 配置**:
```javascript
populate: {
  wishlist: {
    populate: {
      main_image: {
        populate: '*'
      },
      category: true
    }
  }
}
```

**结论**: 后端API配置正确，应该返回完整的图片信息。

### 4. 可能的问题原因

1. **数据结构不一致**: 从后端API返回的 `main_image` 数据结构可能与前端期望的不一致
2. **URL格式差异**: 后端返回的图片URL格式可能与本地添加时的格式不同
3. **缓存问题**: 收藏夹数据可能存在缓存问题，导致显示旧的或错误的数据
4. **权限问题**: 图片URL可能存在访问权限问题

### 5. 调试建议

1. **添加详细日志**: 在收藏夹页面添加更多调试日志，输出完整的数据结构
2. **对比数据结构**: 对比购物车和收藏夹中相同商品的数据结构差异
3. **检查网络请求**: 使用浏览器开发者工具检查图片请求的状态
4. **验证后端返回**: 直接调用后端API查看返回的数据格式

### 6. 临时解决方案

可以考虑为收藏夹也添加 `persist` 中间件，减少对后端API的依赖：

```javascript
export const useCollectionStore = create<CollectionState>()(persist(
  (set, get) => ({
    // ... existing code
  }),
  {
    name: 'collection-storage',
    storage: createJSONStorage(() => localStorage),
  }
));
```

### 7. 下一步行动

1. 在收藏夹页面添加详细的调试日志
2. 对比购物车和收藏夹的实际数据结构
3. 检查后端API返回的实际数据格式
4. 根据发现的问题进行针对性修复