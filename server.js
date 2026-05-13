import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import productRoutes   from './routes/products.js';
import supplierRoutes  from './routes/suppliers.js';
import customerRoutes  from './routes/customers.js';
import orderRoutes     from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes      from './routes/auth.js';

dotenv.config();
connectDB();

const app = express();

// ── CORS — phải đặt TRƯỚC tất cả routes ──────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/',           (_, res) => res.json({ message: 'Cheri Shop API ✅' }));
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () =>
  console.log(`✅ Server: http://0.0.0.0:${PORT}`)
);

process.on('SIGTERM', () => server.close());
process.on('SIGINT',  () => { server.close(); process.exit(0); });

export default app;
