const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Product = require('../models/Product');

// ============================================
// GET /api/products/stats
// ============================================
router.get('/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const products = await Product.find({ company: companyId });

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const outOfStock = products.filter(p => p.status === 'out-of-stock' || p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        outOfStock,
        totalValue,
        categories: categories.length
      }
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/products - List all products
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 25, search, category, status, sort = '-createdAt' } = req.query;

    const filter = { company: companyId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) filter.category = category;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'fullName')
      .lean();

    // Get unique categories for filter dropdown
    const allCategories = await Product.distinct('category', { company: companyId });

    res.json({
      success: true,
      products,
      categories: allCategories.filter(Boolean),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/products/:id - Get single product
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('createdBy', 'fullName email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/products - Create product
// ============================================
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, sku, category, price, costPrice, currency, stock, unit, status, tags, specifications } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    // Check duplicate SKU within company
    if (sku && sku.trim()) {
      const existing = await Product.findOne({ company: req.user.company, sku: sku.trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
      }
    }

    const product = new Product({
      company: req.user.company,
      name: name.trim(),
      description: description || '',
      sku: sku ? sku.trim() : '',
      category: category || 'General',
      price: price || 0,
      costPrice: costPrice || 0,
      currency: currency || 'USD',
      stock: stock || 0,
      unit: unit || 'pcs',
      status: status || 'active',
      tags: tags || [],
      specifications: specifications || [],
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await product.save();

    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate SKU in this company' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/products/:id - Update product
// ============================================
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, description, sku, category, price, costPrice, currency, stock, unit, status, tags, specifications } = req.body;

    // Check duplicate SKU if changed
    if (sku && sku.trim() && sku.trim() !== product.sku) {
      const existing = await Product.findOne({ company: req.user.company, sku: sku.trim(), _id: { $ne: product._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
      }
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (sku !== undefined) product.sku = sku ? sku.trim() : '';
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (currency !== undefined) product.currency = currency;
    if (stock !== undefined) product.stock = stock;
    if (unit !== undefined) product.unit = unit;
    if (status !== undefined) product.status = status;
    if (tags !== undefined) product.tags = tags;
    if (specifications !== undefined) product.specifications = specifications;
    product.updatedBy = req.user._id;

    await product.save();

    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate SKU in this company' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/products/:id - Delete product
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/products - Bulk delete
// ============================================
router.delete('/', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No product IDs provided' });
    }

    const result = await Product.deleteMany({
      _id: { $in: ids },
      company: req.user.company
    });

    res.json({ success: true, message: `${result.deletedCount} product(s) deleted` });
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
