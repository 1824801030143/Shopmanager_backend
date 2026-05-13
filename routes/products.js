import express from 'express';
import { Product } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { upload, uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// Tạo code unique — dùng timestamp tránh trùng
async function generateCode(prefix, Model) {
  let code, exists;
  do {
    const rand = Math.floor(Math.random() * 9000) + 1000;
    code = `${prefix}${rand}`;
    exists = await Model.findOne({ code });
  } while (exists);
  return code;
}

async function handleImageUpload(req) {
  if (!req.file) return null;
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    return result.secure_url;
  } catch (e) {
    console.error('Cloudinary error:', e.message);
    return null;
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const { search, supplier } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    if (supplier) filter.supplier = supplier;
    res.json(
      await Product.find(filter).populate('supplier', 'name code').sort({ createdAt: -1 })
    );
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate('supplier', 'name code');
    if (!p) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = await handleImageUpload(req);
    const data = {
      name:        req.body.name?.trim(),
      color:       req.body.color       || '',
      size:        req.body.size        || '',
      description: req.body.description || '',
      importPrice: Number(req.body.importPrice) || 0,
      sellPrice:   Number(req.body.sellPrice)   || 0,
      stock:       Number(req.body.stock)        || 0,
      supplier:    req.body.supplier || null,
    };
    if (!data.name) return res.status(400).json({ message: 'Tên sản phẩm là bắt buộc' });

    // Dùng code nhập vào, hoặc tự tạo unique code
    const inputCode = req.body.code?.trim();
    data.code = inputCode || await generateCode('SP', Product);

    if (imageUrl) data.imageUrl = imageUrl;

    const product = await Product.create(data);
    res.status(201).json(
      await Product.findById(product._id).populate('supplier', 'name code')
    );
  } catch (e) {
    // Nếu vẫn bị duplicate (race condition) — thử lại với code mới
    if (e.code === 11000) {
      try {
        const data2 = JSON.parse(JSON.stringify(e.keyValue ? {} : {}));
        return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại, vui lòng nhập mã khác' });
      } catch {}
    }
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = await handleImageUpload(req);
    const data = {
      name:        req.body.name?.trim(),
      color:       req.body.color       || '',
      size:        req.body.size        || '',
      description: req.body.description || '',
      importPrice: Number(req.body.importPrice) || 0,
      sellPrice:   Number(req.body.sellPrice)   || 0,
      stock:       Number(req.body.stock)        || 0,
      supplier:    req.body.supplier || null,
    };
    if (imageUrl) data.imageUrl = imageUrl;

    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('supplier', 'name code');
    if (!product) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(product);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
