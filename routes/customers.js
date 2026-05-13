import express from 'express';
import { Customer, Order } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

async function generateCode(prefix, Model) {
  let code, exists;
  do {
    const rand = Math.floor(Math.random() * 9000) + 1000;
    code = `${prefix}${rand}`;
    exists = await Model.findOne({ code });
  } while (exists);
  return code;
}

// STATIC trước /:id
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { customer: { $ne: null } } },
      { $group: {
          _id:         '$customer',
          totalSpent:  { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } },
          totalOrders: { $sum: 1 },
          lastOrder:   { $max: '$createdAt' },
      }},
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: '$info' },
      { $project: { _id: 0, customerId: '$_id', name: '$info.name', code: '$info.code', phone: '$info.phone', totalSpent: 1, totalOrders: 1, lastOrder: 1 } },
      { $sort: { totalSpent: -1 } },
    ]);
    res.json(stats);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, withStats } = req.query;
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }] }
      : {};
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    if (withStats === 'true') {
      const statsArr = await Order.aggregate([
        { $match: { customer: { $in: customers.map(c => c._id) } } },
        { $group: { _id: '$customer', totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } }, totalOrders: { $sum: 1 }, lastOrder: { $max: '$createdAt' } } },
      ]);
      const map = {};
      statsArr.forEach(s => { map[s._id.toString()] = s; });
      return res.json(customers.map(c => ({
        ...c,
        totalSpent:  map[c._id.toString()]?.totalSpent  || 0,
        totalOrders: map[c._id.toString()]?.totalOrders || 0,
        lastOrder:   map[c._id.toString()]?.lastOrder   || null,
      })));
    }
    res.json(customers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await Customer.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    const orders = await Order.find({ customer: req.params.id })
      .populate('items.product', 'name code imageUrl').sort({ createdAt: -1 }).lean();
    const totalSpent  = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
    res.json({ ...c, orders, totalSpent, totalOrders: orders.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name?.trim()) return res.status(400).json({ message: 'Tên khách hàng là bắt buộc' });
    data.code = data.code?.trim() || await generateCode('KH', Customer);
    res.status(201).json(await Customer.create(data));
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Mã khách hàng đã tồn tại' });
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const c = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(c);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
