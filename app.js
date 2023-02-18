/*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      var msg_openai = "";

      async function rresp() {
        if (msg_body.startsWith("/images")) {
          await axios({
            method: "POST",
            url: "https://api.openai.com/v1/images/generations",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer YOUR_API_KEY",
            },
            data: {
              prompt: msg_body.substring(msg_body.indexOf("/images")+7)+" HD, detailed",
              n: 1,
              size: "1024x1024",
            },
          })
            .then((response) => {
              console.log(response);
              msg_openai = response.data.data[0].url;
            })
            .catch((err) => {
            msg_openai="https://upload.wikimedia.org/wikipedia/commons/f/f7/Generic_error_message.png"
          });
          //////////////////////////////////////////////////////////////////////////Image after send msg
          axios({
            method: "POST", // Required, HTTP method, a string, e.g. POST, GET
            url:
              "https://graph.facebook.com/v12.0/" +
              phone_number_id +
              "/messages?access_token=" +
              token,
            data: {
              messaging_product: "whatsapp",
              to: from,
              type: "image",
              image: {
                
                link: msg_openai,
              },
            },
            headers: { "Content-Type": "application/json" },
          }).catch((err) => {
            console.log(err);
          });
        } else {
          await axios({
            method: "POST",
            url: "https://api.openai.com/v1/completions",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer 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",
            },
            data: {
              model: "text-davinci-003",
              prompt: msg_body,
              temperature: 0.78,
              max_tokens: 1600,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0,
            },
          })
            .then((response) => {
              console.log(response);
              msg_openai = response.data.choices[0].text;
              console.log(response);
              // console.log(myresp[2])
              // console.log(response.choices[0].text)
              // console.log(response.id)
            })
            .catch((err) => {
              msg_openai = "error:" + err;
            });
          axios({
            method: "POST", // Required, HTTP method, a string, e.g. POST, GET
            url:
              "https://graph.facebook.com/v12.0/" +
              phone_number_id +
              "/messages?access_token=" +
              token,
            data: {
              messaging_product: "whatsapp",
              to: from,
              text: { body: msg_body + "\nAnswer:" + msg_openai },
            },
            headers: { "Content-Type": "application/json" },
          }).catch((err) => {
            console.log(err);
          });
        }
      }
      rresp();
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
