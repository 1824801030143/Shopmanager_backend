import express from 'express';
import { Supplier } from '../models/index.js';
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
    const { search } = req.query;
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }] }
      : {};
    res.json(await Supplier.find(filter).sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const s = await Supplier.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(s);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name?.trim()) return res.status(400).json({ message: 'Tên nhà cung cấp là bắt buộc' });
    data.code = data.code?.trim() || await generateCode('NCC', Supplier);
    res.status(201).json(await Supplier.create(data));
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại' });
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!s) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(s);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
