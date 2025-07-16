# 🌍 Ambelie 完整订单系统运作流程

## 📋 系统概述

Ambelie 是一个面向海外市场的中式家居电商平台，需要处理国际订单、跨境物流和多币种支付。本文档详细说明了从用户下单到订单完成的完整流程。

## 🔄 **1. 用户下单流程**

### 1.1 前端用户操作
```
用户浏览商品 → 添加到购物车 → 结账页面 → 填写信息 → 支付 → 订单成功
```

### 1.2 系统自动处理
1. **Stripe支付成功** → 触发webhook
2. **自动创建订单** (`status: 'paid'`)
3. **生成订单号** (`ORDER-{timestamp}-{random}`)
4. **创建订单项** (产品快照，防止价格变动)
5. **发送确认邮件** (计划中)

### 1.3 数据结构
```json
{
  "order": {
    "orderNumber": "ORDER-1703123456789-abc123",
    "status": "paid",
    "totalAmount": 299.99,
    "currency": "USD",
    "customerEmail": "customer@example.com",
    "customerName": "John Smith",
    "shippingAddress": {
      "country": "US",
      "state": "CA",
      "city": "San Francisco",
      "postalCode": "94102",
      "line1": "123 Main St"
    },
    "orderItems": [
      {
        "productSnapshot": {
          "id": "prod_123",
          "name": "Chinese Wooden Screen",
          "price": 299.99,
          "description": "Traditional Chinese folding screen"
        },
        "quantity": 1,
        "unitPrice": 299.99
      }
    ]
  }
}
```

## 🏢 **2. 后台工作人员操作流程**

### 2.1 订单确认阶段 (24小时内)
**责任人：订单管理员**

#### 检查清单：
- [ ] 验证订单信息完整性
- [ ] 确认商品库存
- [ ] 验证收货地址格式
- [ ] 检查支付状态

#### 操作步骤：
1. **登录后台管理系统**
   ```
   https://ambelie-backend-production.up.railway.app/admin
   ```

2. **查看新订单**
   - 进入 "Orders" 管理页面
   - 筛选状态为 "paid" 的订单
   - 按时间倒序排列

3. **订单确认**
   ```http
   PUT /api/orders/{orderId}/status
   {
     "status": "confirmed",
     "note": "订单已确认，准备处理"
   }
   ```

### 2.2 订单处理阶段 (1-2个工作日)
**责任人：仓库管理员**

#### 操作步骤：
1. **更新订单状态为处理中**
   ```http
   PUT /api/orders/{orderId}
   {
     "status": "processing",
     "notes": "订单处理中，正在准备商品"
   }
   ```

2. **商品准备**
   - 从库存中提取商品
   - 质量检查
   - 包装准备
   - 生成装箱单

3. **准备国际运输文件**
   - 商业发票 (Commercial Invoice)
   - 装箱单 (Packing List)
   - 原产地证明 (Certificate of Origin)
   - 出口报关单

### 2.3 发货阶段 (处理完成后)
**责任人：物流专员**

#### 选择物流商：
基于目的地选择最优物流商：

| 目的地 | 推荐物流商 | 时效 | 价格等级 |
|--------|------------|------|----------|
| 美国 | UPS, FedEx | 3-5天 | 高 |
| 欧洲 | DHL, TNT | 4-7天 | 中高 |
| 亚洲 | DHL, SF Express | 2-4天 | 中 |
| 其他 | DHL | 5-10天 | 中高 |

#### 发货操作：
1. **创建运单**
   - 登录物流商官网
   - 填写收发货人信息
   - 选择服务类型
   - 获取追踪号码

2. **更新系统信息**
   ```http
   PUT /api/orders/{orderId}
   {
     "status": "shipped",
     "trackingNumber": "1Z12345E0291980793",
     "carrier": "ups",
     "carrierName": "UPS",
     "trackingUrl": "https://www.ups.com/track?tracknum=1Z12345E0291980793",
     "shippingDate": "2024-01-15T10:30:00Z",
     "estimatedDeliveryDate": "2024-01-20T18:00:00Z"
   }
   ```

3. **客户通知**
   - 发送发货通知邮件
   - 包含追踪号码和链接
   - 预计到达时间

### 2.4 配送跟踪阶段
**责任人：客服专员**

#### 自动化跟踪：
```javascript
// 物流商webhook处理
async function handleCarrierWebhook(trackingData) {
  const { trackingNumber, status, location, timestamp } = trackingData;
  
  // 更新订单状态
  await updateOrderStatus(orderId, mapCarrierStatus(status), {
    location,
    timestamp,
    note: `包裹位置: ${location}`
  });
  
  // 通知客户
  await sendStatusUpdateEmail(customerEmail, status, location);
}
```

#### 手动跟踪：
- 每日检查未到达订单
- 联系物流商查询异常
- 更新客户状态

## 🌍 **3. 国际物流管理系统**

### 3.1 物流商API集成建议

#### UPS集成：
```javascript
// UPS Tracking API
const trackUPSPackage = async (trackingNumber) => {
  const response = await fetch(`https://onlinetools.ups.com/api/track/${trackingNumber}`, {
    headers: {
      'Authorization': `Bearer ${UPS_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return {
    status: data.trackResponse.shipment[0].package[0].activity[0].status,
    location: data.trackResponse.shipment[0].package[0].activity[0].location,
    timestamp: data.trackResponse.shipment[0].package[0].activity[0].timestamp
  };
};
```

#### FedEx集成：
```javascript
// FedEx Track API
const trackFedExPackage = async (trackingNumber) => {
  const response = await fetch('https://api.fedex.com/track/v1/trackingnumbers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEDEX_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }]
    })
  });
  
  return await response.json();
};
```

### 3.2 物流状态映射

#### 物流商状态 → 系统状态映射：
```javascript
const mapCarrierStatusToOrderStatus = (carrier, carrierStatus) => {
  const statusMap = {
    'ups': {
      'I': 'shipped',           // In Transit
      'D': 'delivered',         // Delivered
      'X': 'cancelled',         // Exception
      'M': 'shipped'            // Manifest
    },
    'fedex': {
      'IT': 'shipped',          // In transit
      'DL': 'delivered',        // Delivered
      'DE': 'cancelled',        // Delivery exception
      'PU': 'shipped'           // Picked up
    },
    'dhl': {
      'transit': 'shipped',
      'delivered': 'delivered',
      'exception': 'cancelled'
    }
  };
  
  return statusMap[carrier]?.[carrierStatus] || 'shipped';
};
```

### 3.3 海关清关处理

#### 常见清关文件：
1. **商业发票** (Commercial Invoice)
2. **装箱单** (Packing List)
3. **原产地证明** (Certificate of Origin)
4. **海关报关单** (Customs Declaration)

#### 清关延误处理：
```javascript
// 检测清关延误
const checkCustomsDelay = async (trackingNumber) => {
  const trackingData = await getTrackingData(trackingNumber);
  
  // 如果在海关超过3天
  if (trackingData.location.includes('customs') && 
      getDaysSince(trackingData.timestamp) > 3) {
    
    // 标记为清关延误
    await updateOrderStatus(orderId, 'shipped', {
      note: '清关延误，客服将联系客户',
      requiresAttention: true
    });
    
    // 通知客户
    await sendCustomsDelayNotification(customerEmail);
  }
};
```

## 📊 **4. 后台管理界面建议**

### 4.1 订单管理Dashboard
推荐创建以下管理页面：

#### 主Dashboard显示：
- 今日新订单数量
- 待处理订单列表
- 物流异常警报
- 销售统计图表

#### 订单列表功能：
- 状态筛选
- 时间范围筛选
- 客户搜索
- 批量操作

### 4.2 物流管理功能
```javascript
// 批量更新物流状态
const batchUpdateShippingStatus = async (orderIds) => {
  for (const orderId of orderIds) {
    const order = await getOrder(orderId);
    if (order.trackingNumber) {
      const status = await getTrackingStatus(order.trackingNumber, order.carrier);
      await updateOrderStatus(orderId, status);
    }
  }
};
```

## 📈 **5. 系统监控和报警**

### 5.1 关键指标监控
- 订单处理时间
- 物流追踪成功率
- 客户满意度
- 异常订单比例

### 5.2 自动化报警
```javascript
// 订单异常报警
const orderAlertSystem = {
  // 支付异常
  paymentFailure: (orderId) => {
    sendAlert('payment_team', `订单 ${orderId} 支付失败`);
  },
  
  // 物流延误
  shippingDelay: (orderId, days) => {
    sendAlert('logistics_team', `订单 ${orderId} 超期 ${days} 天未发货`);
  },
  
  // 清关延误
  customsDelay: (orderId, location) => {
    sendAlert('customer_service', `订单 ${orderId} 在 ${location} 清关延误`);
  }
};
```

## 🔧 **6. 技术实现建议**

### 6.1 后端API增强
建议添加以下API接口：

```typescript
// 批量订单操作
POST /api/orders/batch-update
{
  "orderIds": ["123", "456"],
  "updates": {
    "status": "processing",
    "note": "批量处理"
  }
}

// 物流追踪更新
POST /api/orders/tracking-webhook
{
  "trackingNumber": "1Z12345E0291980793",
  "carrier": "ups",
  "status": "in_transit",
  "location": "San Francisco, CA",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 订单统计
GET /api/orders/statistics
{
  "dateRange": "2024-01-01,2024-01-31",
  "groupBy": "status"
}
```

### 6.2 前端管理界面
建议创建管理员界面：

```javascript
// 订单管理组件
const OrderManagementDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'week'
  });
  
  return (
    <div className="admin-dashboard">
      <OrderFilters filters={filters} onChange={setFilters} />
      <OrderList orders={orders} onUpdate={handleOrderUpdate} />
      <ShippingLabelGenerator />
      <TrackingUpdater />
    </div>
  );
};
```

## 📞 **7. 客户服务集成**

### 7.1 客户查询处理
- 订单状态查询
- 物流追踪查询
- 退换货处理
- 投诉建议处理

### 7.2 多语言支持
- 中文客服 (中国市场)
- 英文客服 (国际市场)
- 时区覆盖 (24小时服务)

## 🚀 **8. 下一步优化建议**

### 8.1 短期优化 (1-2周)
- [ ] 完善后台管理界面
- [ ] 集成主要物流商API
- [ ] 添加邮件通知功能
- [ ] 优化订单状态流程

### 8.2 中期优化 (1-2个月)
- [ ] 添加库存管理系统
- [ ] 实现自动化物流选择
- [ ] 客户服务系统集成
- [ ] 数据分析和报表功能

### 8.3 长期优化 (3-6个月)
- [ ] AI智能客服
- [ ] 预测性物流分析
- [ ] 供应链管理系统
- [ ] 全球仓储网络

## 📋 **总结**

Ambelie的订单系统已经具备了完整的基础架构，包括：
- ✅ 完整的订单生命周期管理
- ✅ 国际物流商支持
- ✅ 支付集成和webhook处理
- ✅ 订单状态追踪系统

**关键成功因素：**
1. **高效的后台操作流程** - 确保订单及时处理
2. **可靠的物流追踪** - 提供透明的配送信息
3. **优秀的客户服务** - 处理异常情况和客户咨询
4. **系统监控和报警** - 及时发现和解决问题

通过以上完整的运作流程，Ambelie可以为海外客户提供专业、可靠的购物体验。 