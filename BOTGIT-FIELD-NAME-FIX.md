// Fixed version - Update Backend/routes/botgit-extension.js line 79-80

// OLD (incorrect field names):
const tradeShow = await TradeShow.findById(user.botgitSettings.selectedTradeShowId)
  .select('showName showLocation');

// NEW (correct field names):
const tradeShow = await TradeShow.findById(user.botgitSettings.selectedTradeShowId)
  .select('shortName fullName location');

// And update the response to use the correct fields:
if (tradeShow) {
  return res.json({
    success: true,
    settings: {
      selectedTradeShowId: user.botgitSettings.selectedTradeShowId,
      tradeShowName: tradeShow.fullName || tradeShow.shortName,  // Use fullName, fallback to shortName
      tradeShowLocation: tradeShow.location,  // Changed from showLocation to location
      extractionType: user.botgitSettings.extractionType,
      updatedAt: user.botgitSettings.updatedAt
    }
  });
}
