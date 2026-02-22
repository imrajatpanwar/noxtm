require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';
mongoose.connect(uri).then(async () => {
  const r = await mongoose.connection.db.collection('whatsappchatbots').findOne({});
  console.log('cooldownMinutes:', r.cooldownMinutes);
  console.log('enabled:', r.enabled);
  console.log('provider:', r.provider);
  // Update cooldown to 0 if it's still 1
  if (r.cooldownMinutes > 0) {
    await mongoose.connection.db.collection('whatsappchatbots').updateMany({}, { $set: { cooldownMinutes: 0 } });
    console.log('FIXED: cooldownMinutes set to 0');
  }
  process.exit();
}).catch(e => { console.error(e.message); process.exit(1); });
