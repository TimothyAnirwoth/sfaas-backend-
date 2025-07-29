const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const { twiml: { MessagingResponse } } = require("twilio");

const app = express();
const upload = multer(); // memory storage

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const roboflowURL = "https://serverless.roboflow.com/plant-disease-detection-v2-2nclk-1nlga/2";
const roboflowAPIKey = "3ljfVdk94Wi0WmmyCzcO";

app.post("/whatsapp", upload.none(), async (req, res) => {
  const msgBody = req.body.Body;
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;

  console.log("From:", from);
  console.log("Message:", msgBody);
  console.log("Image URL:", mediaUrl);

  const twiml = new MessagingResponse();
  let diagnosis = "";

  if (!mediaUrl) {
    diagnosis = "Please send a clear image of your plant for diagnosis.";
    twiml.message(diagnosis);
  } else {
    try {
      const response = await axios({
        method: "POST",
        url: roboflowURL,
        params: {
          api_key: roboflowAPIKey,
          image: mediaUrl,
        }
      });

      const predictions = response.data.predictions;

      if (predictions.length === 0) {
        diagnosis = "Sorry, we couldn’t detect any plant diseases in that image.";
      } else {
        const topPrediction = predictions[0];
        diagnosis = `🩺 Diagnosis: ${topPrediction.class} (Confidence: ${(topPrediction.confidence * 100).toFixed(2)}%)`;
      }

      twiml.message(diagnosis);
    } catch (err) {
      console.error("Diagnosis error:", err.message);
      diagnosis = "There was an error during diagnosis. Please try again later.";
      twiml.message(diagnosis);
    }
  }

  // ✅ Save to Firestore
  try {
    await db.collection("messages").add({
      from,
      body: msgBody,
      imageUrl: mediaUrl || null,
      diagnosis,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving to Firestore:", error.message);
  }

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
