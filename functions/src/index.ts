import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

export const sendNotificationOnNewMessage = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot) => {
    const message = snapshot.data();
    if (!message) {
      console.log("No message data found");
      return;
    }

    const { receiverId, senderName, content } = message;

    // Get the FCM token of the receiver
    const tokenSnapshot = await db.collection("fcmTokens").doc(receiverId).get();
    if (!tokenSnapshot.exists) {
      console.log(`No FCM token found for user: ${receiverId}`);
      return;
    }

    const tokenData = tokenSnapshot.data();
    if (!tokenData || !tokenData.token) {
      console.log(`Token data is invalid for user: ${receiverId}`);
      return;
    }

    const token = tokenData.token;

    // Notification payload
    const payload = {
      notification: {
        title: `New message from ${senderName}`,
        body: content,
        clickAction: "/friends", // or a more specific chat screen
      },
      token: token,
    };

    try {
      console.log(`Sending notification to token: ${token}`);
      await fcm.send(payload);
      console.log("Notification sent successfully");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  });
