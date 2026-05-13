import mongoose from 'mongoose';

// ─── Supplier ─────────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema({
  code:    { type: String, unique: true, sparse: true },
  name:    { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
}, { timestamps: true });

// ─── Customer ─────────────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema({
  code:    { type: String, unique: true, sparse: true },
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, default: '' },
  address: { type: String, default: '' },
  email:   { type: String, default: '' },
  note:    { type: String, default: '' },
}, { timestamps: true });

// ─── Product ──────────────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  code:        { type: String, unique: true, sparse: true },
  name:        { type: String, required: true, trim: true },
  color:       { type: String, default: '' },
  size:        { type: String, default: '' },
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  imageUrl:    { type: String, default: '' },
  description: { type: String, default: '' },
  importPrice: { type: Number, default: 0 },
  sellPrice:   { type: Number, default: 0 },
  stock:       { type: Number, default: 0 },
}, { timestamps: true });

// ─── Order ────────────────────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  price:    { type: Number, default: 0, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  code:     { type: String, unique: true, sparse: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  items:    { type: [orderItemSchema], default: [] },
  total:    { type: Number, default: 0 },
  status:   { type: String, enum: ['pending','processing','completed','cancelled'], default: 'pending' },
  note:     { type: String, default: '' },
}, { timestamps: true });

export const Supplier = mongoose.model('Supplier', supplierSchema);
export const Customer = mongoose.model('Customer', customerSchema);
export const Product  = mongoose.model('Product',  productSchema);
export const Order    = mongoose.model('Order',    orderSchema);
