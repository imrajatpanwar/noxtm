const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtmstudio';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Category Schema (same as in server.js)
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

// Default categories to create
const defaultCategories = [
  {
    name: 'Web Development',
    description: 'Articles about web development, programming, and coding best practices'
  },
  {
    name: 'Digital Marketing',
    description: 'Insights and tips about digital marketing strategies and trends'
  },
  {
    name: 'SEO',
    description: 'Search engine optimization tips and techniques'
  },
  {
    name: 'Business Growth',
    description: 'Strategies and insights for growing your business'
  },
  {
    name: 'Technology',
    description: 'Latest technology trends and innovations'
  },
  {
    name: 'Design',
    description: 'Design principles, UI/UX, and creative inspiration'
  }
];

async function seedCategories() {
  try {
    console.log('🌱 Starting to seed default categories...');
    
    // Check if categories already exist
    const existingCategories = await Category.countDocuments();
    
    if (existingCategories > 0) {
      console.log(`ℹ️  ${existingCategories} categories already exist. Skipping seed.`);
      process.exit(0);
    }
    
    // Create default categories
    for (const categoryData of defaultCategories) {
      const category = new Category({
        ...categoryData,
        slug: categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      });
      await category.save();
      console.log(`✅ Created category: ${category.name} (${category.slug})`);
    }
    
    console.log(`🎉 Successfully created ${defaultCategories.length} default categories!`);
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Run the seeding
seedCategories();