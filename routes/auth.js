import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const ADMIN = { username: 'admin', password: 'cherishop2024' };

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN.username || password !== ADMIN.password)
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

export default router;
