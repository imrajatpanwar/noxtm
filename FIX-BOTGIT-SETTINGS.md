# Fix: Add botgitSettings to User Schema

## Issue
The User schema was missing the `botgitSettings` field, causing the Chrome extension to show "No Configuration Found" even after saving settings.

## Changes Required

In `Backend/server.js`, add the `botgitSettings` field to the userSchema (around line 202, before `createdAt`):

```javascript
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Terminated', 'In Review']
  },
  // Botgit Chrome Extension Settings
  botgitSettings: {
    selectedTradeShowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeShow' },
    extractionType: { type: String, enum: ['exhibitors', 'companies'] },
    updatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

## Test After Fix
1. Go to https://noxtm.com/botgit
2. Select a trade show and extraction type
3. Click "Save Settings"
4. Open Chrome extension
5. Should now show the form instead of "No Configuration Found"
