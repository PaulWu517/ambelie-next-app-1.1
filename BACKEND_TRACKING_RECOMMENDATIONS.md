# Backend API Recommendations for International Order Tracking

## 📋 Current Backend Analysis

Your Strapi backend already has a solid foundation for order management. Here's what you currently have:

### ✅ Current Features
- Complete order CRUD operations
- Order status enumeration: `pending`, `paid`, `processing`, `shipped`, `delivered`, `completed`, `cancelled`
- `trackingNumber` and `shippingMethod` fields
- Customer order lookup by email
- Stripe payment integration

## 🚀 Recommended Backend Enhancements

### 1. Update Order Status Enum (Priority: High)
Add international shipping statuses to your order schema:

```json
// ambelie-backend/src/api/order/content-types/order/schema.json
{
  "status": {
    "type": "enumeration",
    "enum": [
      "pending",
      "confirmed",
      "paid", 
      "processing",
      "shipped",
      "out_for_delivery",  // 🆕 New status
      "delivered",
      "completed",
      "cancelled",
      "refunded"           // 🆕 New status
    ],
    "default": "pending",
    "required": true
  }
}
```

### 2. Add Carrier Information Fields (Priority: High)
Enhance the order schema with international carrier support:

```json
// Add these fields to order schema
{
  "carrier": {
    "type": "enumeration",
    "enum": [
      "ups",
      "fedex", 
      "dhl",
      "usps",
      "tnt",
      "dpex",
      "aramex",
      "sf_express",
      "china_post",
      "other"
    ]
  },
  "carrierName": {
    "type": "string"
  },
  "trackingUrl": {
    "type": "string"
  },
  "estimatedDeliveryDate": {
    "type": "datetime"
  },
  "shippingRegion": {
    "type": "enumeration",
    "enum": ["US", "EU", "ASIA", "CHINA", "WORLDWIDE", "OTHER"]
  }
}
```

### 3. Create Order Status History API (Priority: Medium)
Add a new content type for tracking status changes:

```json
// ambelie-backend/src/api/order-status-history/content-types/order-status-history/schema.json
{
  "kind": "collectionType",
  "collectionName": "order_status_histories",
  "info": {
    "singularName": "order-status-history",
    "pluralName": "order-status-histories",
    "displayName": "Order Status History"
  },
  "attributes": {
    "order": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::order.order"
    },
    "status": {
      "type": "string",
      "required": true
    },
    "note": {
      "type": "text"
    },
    "location": {
      "type": "string"
    },
    "trackingNumber": {
      "type": "string"
    },
    "updatedBy": {
      "type": "string"
    },
    "timestamp": {
      "type": "datetime",
      "required": true
    }
  }
}
```

### 4. Add Order Status Update API (Priority: High)
Enhance the order controller with status tracking:

```typescript
// ambelie-backend/src/api/order/controllers/order.ts

// Add these methods to your existing controller:

async updateOrderStatus(ctx) {
  try {
    const { id } = ctx.params;
    const { status, note, location, trackingNumber, estimatedDeliveryDate } = ctx.request.body;

    // Update order status
    const order = await strapi.entityService.update('api::order.order', id, {
      data: { 
        status,
        ...(trackingNumber && { trackingNumber }),
        ...(estimatedDeliveryDate && { estimatedDeliveryDate })
      },
    });

    // Create status history entry
    await strapi.entityService.create('api::order-status-history.order-status-history', {
      data: {
        order: id,
        status,
        note,
        location,
        trackingNumber,
        timestamp: new Date(),
        updatedBy: ctx.state.user?.username || 'System'
      }
    });

    return ctx.send({
      success: true,
      data: order,
    });
  } catch (error) {
    strapi.log.error('Update order status failed:', error);
    return ctx.internalServerError('Failed to update order status');
  }
},

async getOrderStatusHistory(ctx) {
  try {
    const { id } = ctx.params;
    
    const statusHistory = await strapi.entityService.findMany(
      'api::order-status-history.order-status-history', 
      {
        filters: { order: id },
        sort: { timestamp: 'desc' },
      }
    );

    return ctx.send({
      success: true,
      data: statusHistory,
    });
  } catch (error) {
    strapi.log.error('Get order status history failed:', error);
    return ctx.internalServerError('Failed to get order status history');
  }
}
```

### 5. Add Tracking Integration API (Priority: Medium)
Create webhook endpoints for carrier tracking updates:

```typescript
// ambelie-backend/src/api/order/controllers/order.ts

async trackingWebhook(ctx) {
  try {
    const { carrier, trackingNumber, status, location, timestamp } = ctx.request.body;
    
    // Find order by tracking number
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: { trackingNumber }
    });
    
    if (orders.length === 0) {
      return ctx.notFound('Order not found');
    }
    
    const order = orders[0];
    
    // Map carrier status to our status
    const mappedStatus = mapCarrierStatusToOrderStatus(carrier, status);
    
    if (mappedStatus) {
      // Update order status
      await strapi.entityService.update('api::order.order', order.id, {
        data: { status: mappedStatus }
      });
      
      // Create status history
      await strapi.entityService.create('api::order-status-history.order-status-history', {
        data: {
          order: order.id,
          status: mappedStatus,
          location,
          trackingNumber,
          timestamp: timestamp || new Date(),
          note: `Update from ${carrier}`,
          updatedBy: `${carrier}_webhook`
        }
      });
    }
    
    return ctx.send({ success: true });
  } catch (error) {
    strapi.log.error('Tracking webhook failed:', error);
    return ctx.internalServerError('Tracking webhook failed');
  }
}
```

### 6. Add New API Routes (Priority: High)
Update your routes file:

```typescript
// ambelie-backend/src/api/order/routes/order.ts

export default {
  routes: [
    // ... existing routes ...
    
    // New tracking routes
    {
      method: 'PUT',
      path: '/orders/:id/status',
      handler: 'order.updateOrderStatus',
    },
    {
      method: 'GET', 
      path: '/orders/:id/status-history',
      handler: 'order.getOrderStatusHistory',
      config: {
        auth: false, // Allow public access for order tracking
      },
    },
    {
      method: 'POST',
      path: '/orders/tracking-webhook',
      handler: 'order.trackingWebhook',
      config: {
        auth: false, // Webhook from carriers
      },
    },
    {
      method: 'GET',
      path: '/orders/track/:trackingNumber',
      handler: 'order.trackByNumber',
      config: {
        auth: false, // Public tracking
      },
    }
  ],
};
```

## 🔧 Implementation Priority

### Phase 1 (Immediate - This Week)
1. ✅ Update order status enum
2. ✅ Add carrier fields to order schema  
3. ✅ Create order status update API

### Phase 2 (Next Week)
1. 🔄 Create order status history content type
2. 🔄 Implement status history API
3. 🔄 Add public order tracking endpoint

### Phase 3 (Future Enhancement)
1. ⏳ Integrate with carrier APIs (UPS, FedEx, DHL)
2. ⏳ Add automated status notifications
3. ⏳ Create admin dashboard for order management

## 🌐 International Considerations

### Multi-Region Support
- Add shipping region field
- Support multiple currencies
- Timezone-aware delivery estimates

### Carrier Integration
- UPS: TrackingAPI
- FedEx: Track API  
- DHL: Shipment Tracking API
- USPS: Tracking API

### Localization
- Status descriptions in multiple languages
- Regional carrier preferences
- Local delivery time estimates

## 📞 API Testing

Once implemented, you can test the new APIs:

```bash
# Update order status
PUT /api/orders/123/status
{
  "status": "shipped",
  "trackingNumber": "1Z999AA1234567890",
  "carrier": "ups",
  "note": "Package shipped from warehouse",
  "estimatedDeliveryDate": "2024-01-15T18:00:00Z"
}

# Get status history
GET /api/orders/123/status-history

# Track by tracking number  
GET /api/orders/track/1Z999AA1234567890
```

## 🎯 Benefits

With these improvements, you'll have:
- ✅ Full international shipping support
- ✅ Real-time order tracking
- ✅ Professional carrier integration
- ✅ Complete order history
- ✅ Webhook support for automation
- ✅ Public tracking pages

This positions your platform as a professional international e-commerce solution! 🚀 