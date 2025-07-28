const express = require("express");
const multer = require("multer");
const axios = require("axios");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();
const upload = multer({ dest: "uploads/" }); // for local testing

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/whatsapp", upload.single("MediaUrl0"), async (req, res) => {
  const msgBody = req.body.Body;
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;

  console.log("Message:", msgBody);
  console.log("From:", from);
  console.log("Image URL:", mediaUrl);

  const diagnosis = mediaUrl
    ? "This plant may have maize leaf blight."
    : "Please send a clear image of your plant for diagnosis.";

  const twiml = new MessagingResponse();
  twiml.message(diagnosis);

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
