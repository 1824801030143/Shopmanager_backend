import express from 'express';
import { Order } from '../models/index.js';
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

router.get('/', auth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    let orders = await Order.find(filter)
      .populate('customer', 'name code phone')
      .populate('supplier', 'name code')
      .populate('items.product', 'name code imageUrl')
      .sort({ createdAt: -1 });
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o.code?.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q)
      );
    }
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const o = await Order.findById(req.params.id)
      .populate('customer', 'name code phone')
      .populate('supplier', 'name code contact')
      .populate('items.product', 'name code imageUrl sellPrice');
    if (!o) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(o);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customer, supplier, status, note, items } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
    const parsedItems = items.map(i => ({
      product:  i.product,
      quantity: Number(i.quantity) || 1,
      price:    Number(i.price)    || 0,
    }));
    const total = parsedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const code  = await generateCode('DH', Order);
    const order = await Order.create({
      code,
      customer: customer || null,
      supplier: supplier || null,
      items: parsedItems,
      total,
      status: status || 'pending',
      note:   note   || '',
    });
    res.status(201).json(
      await Order.findById(order._id)
        .populate('customer', 'name code')
        .populate('supplier', 'name code')
        .populate('items.product', 'name code imageUrl')
    );
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { status, note, items } = req.body;
    const update = {};
    if (status) update.status = status;
    if (note !== undefined) update.note = note;
    if (items) {
      const parsedItems = items.map(i => ({
        product:  i.product,
        quantity: Number(i.quantity) || 1,
        price:    Number(i.price)    || 0,
      }));
      update.items = parsedItems;
      update.total = parsedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('customer', 'name code phone')
      .populate('supplier', 'name code contact')
      .populate('items.product', 'name code imageUrl sellPrice');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(order);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
