const { messaging } = require("../config/firebase");

async function sendNotification(tokens, dataPayload = {}) {
  try {
    const payload = {
      data: dataPayload,
    };

    let response;

    if (Array.isArray(tokens)) {
      if (tokens.length === 0) return;
      response = await messaging.sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });
      console.log("✅ Notifications sent:", response.successCount);
    } else {
      response = await messaging.send({
        token: tokens,
        ...payload,
      });
      console.log("✅ Notification sent:", response);
    }

    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error.message);
    throw error;
  }
}
module.exports = sendNotification;
