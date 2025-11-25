const mongoose = require('mongoose');
const Exhibitor = require('./models/Exhibitor');
const TradeShow = require('./models/TradeShow');
require('dotenv').config();

async function clearAndCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n========== CLEARING OLD DATA ==========\n');

    // Delete all exhibitors
    const deleteResult = await Exhibitor.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} exhibitors (old book data)`);

    // Delete all trade shows
    const tradeShowDeleteResult = await TradeShow.deleteMany({});
    console.log(`Deleted ${tradeShowDeleteResult.deletedCount} trade shows\n`);

    console.log('✅ Database cleared! Now run the Eurobike crawler from the dashboard.\n');
    console.log('After running the crawler, use "node check-crawler-data.js" to verify real exhibitor data.\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clearAndCheck();
