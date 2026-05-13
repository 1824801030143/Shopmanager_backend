import express from 'express';
import { Product, Customer, Supplier, Order } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const [productCount, customerCount, supplierCount, orders] = await Promise.all([
      Product.countDocuments(),
      Customer.countDocuments(),
      Supplier.countDocuments(),
      Order.find().populate('customer', 'name').sort({ createdAt: -1 }).lean(),
    ]);

    const revenue       = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const recentOrders  = orders.slice(0, 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const revenueByDay = await Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
          _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      productCount,
      customerCount,
      supplierCount,
      orderCount: orders.length,
      revenue,
      pendingOrders,
      recentOrders,
      revenueByDay,
      statusBreakdown,
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.status(500).json({ message: e.message });
  }
});

export default router;
