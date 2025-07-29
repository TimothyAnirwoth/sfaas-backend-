const express = require("express");
const multer = require("multer");
const axios = require("axios");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();
const upload = multer({ dest: "uploads/" }); // For local testing

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Roboflow config
const roboflowURL = "https://serverless.roboflow.com/plant-disease-detection-v2-2nclk/1";
const roboflowAPIKey = "3ljfVdk94Wi0WmmyCzcO";

app.post("/whatsapp", upload.single("MediaUrl0"), async (req, res) => {
  const msgBody = req.body.Body;
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;

  console.log("Message:", msgBody);
  console.log("From:", from);
  console.log("Image URL:", mediaUrl);

  let diagnosis = "Please send a clear image of your plant for diagnosis.";

  if (mediaUrl) {
    try {
      // Step 1: Download image from Twilio
      const imageResponse = await axios.get(mediaUrl, { responseType: "arraybuffer" });
      const base64Image = Buffer.from(imageResponse.data, "binary").toString("base64");

      // Step 2: Send image to Roboflow
      const response = await axios({
        method: "POST",
        url: roboflowURL,
        params: {
          api_key: roboflowAPIKey,
        },
        data: base64Image,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const prediction = response.data.predictions?.[0];

      if (prediction) {
        diagnosis = `Detected: ${prediction.class} (confidence: ${Math.round(
          prediction.confidence * 100
        )}%)`;
      } else {
        diagnosis = "No clear disease detected. Try another photo.";
      }
    } catch (error) {
      console.error("Diagnosis error:", error.message);
      diagnosis = "Error during diagnosis. Try again later.";
    }
  }

  const twiml = new MessagingResponse();
  twiml.message(diagnosis);
  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
