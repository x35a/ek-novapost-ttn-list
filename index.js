require('dotenv').config();
const express = require('express');
const app = express();

// Serve static files from the public directory
app.use(express.static('public'));

// Serve the HTML page at root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

/* fixme: If ttn creation date is less then data.DateTimeFrom, then ttn won't show up in the list.
It has already happened.
Workaround - to increase DateTimeFrom-DateTimeTo request range.
But still there are some ttns that out of the request range, no solid fix for now. 
*/
/* fixme If afterpayment assigned by mistake and then it's removed after shipping - ttn is still present in the list. 
Probably np gets outdated ttn data from the point when it was created but not changed.
So if afterpayment assigns after shipping it won't get into the list - that's also bug.
fix - request each ttn data using TrackingDocument model, it returns updated data.
-- it could be 50 requests each time instead of 1, i don't like it.
https://developers.novaposhta.ua/view/model/a99d2f28-8512-11ec-8ced-005056b2dbe1/method/a9ae7bc9-8512-11ec-8ced-005056b2dbe1
*/
// todo Exclude small departments (delayed afterpayment)

// request props
// https://developers.novaposhta.ua/view/model/a90d323c-8512-11ec-8ced-005056b2dbe1/method/a9d22b34-8512-11ec-8ced-005056b2dbe1
const url = "https://api.novaposhta.ua/v2.0/json/"; // entry https://developers.novaposhta.ua/documentation
const apiKey = process.env.NP_API_KEY;
const data = {
  apiKey: apiKey,
  modelName: "InternetDocumentGeneral",
  calledMethod: "getDocumentList", // get CREATED ttns in date range
  methodProperties: {
    DateTimeFrom: formatDate(getDaysBackDate(15)),
    DateTimeTo: formatDate(getDaysBackDate(0)),
    GetFullList: "1",
  },
};

const excludeList = ["20451026879542", "20451032573965"];

// SSE endpoint for TTN data
app.get('/events', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client closed connection');
  });

  try {
    // Try to fetch the TTN list
    const ttnList = await fetchTTNList(url, data);
    // Send the loaded data
    res.write(`data: ${ttnList.replace(/\n/g, '<br>')}\n\n`);
  } catch (error) {
    // Handle errors and send a meaningful response
    res.write(`data: ERROR LOADING DATA:<br>${error.message}\n\n`);
  } finally {
    // Send a completion event before closing
    res.write('event: complete\ndata: done\n\n');
    res.end();
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function fetchTTNList(url, data) {
  try {
    // Add 3 seconds delay for testing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`); // Check if the response was successful
    }

    const result = await response.json();

    // Sort result by date
    result.data.sort(
      (a, b) => new Date(b.RecipientDateTime) - new Date(a.RecipientDateTime)
    );

    const removeTime = (dateString) => dateString.split(" ")[0];

    let resultString = "";

    for (const item of result.data) {
      //if (item.IntDocNumber === "20451041678671") console.log(item);

      // AfterpaymentOnGoodsCost // string value. payment sum to fop.
      // BackwardDeliverySum // string value. cash delivery to the office.
      // BackwardDeliveryMoney // number value. the same value as BackwardDeliverySum. diff to BackwardDeliverySum is unknown.
      // StateId https://developers.novaposhta.ua/view/model/a99d2f28-8512-11ec-8ced-005056b2dbe1/method/a9ae7bc9-8512-11ec-8ced-005056b2dbe1

      if (![9, 10, 11].includes(item.StateId)) continue; // proceed received states only
      if (excludeList.includes(item.IntDocNumber)) continue; // skip excludes

      const afterPayment = +item.AfterpaymentOnGoodsCost;

      const backwardDelivery =
        +item.BackwardDeliverySum || +item.BackwardDeliveryMoney;

      if (!afterPayment && !backwardDelivery) continue; // skip no afterpayment

      resultString += `${removeTime(item.RecipientDateTime)} - ${
        afterPayment || `${backwardDelivery} cash`
      }${/Пункт приймання-видачі/i.test(item.RecipientAddressDescription) ? ' delay' : ''} - ${item.IntDocNumber}\n`;
    }

    return resultString;
  } catch (error) {
    // Handle fetch or processing errors
    console.error("Error in fetchTTNList:", error);
    throw new Error("Failed to load TTN list data."); // Re-throw the error to be handled by the server
  }
}

function getDaysBackDate(daysBack) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date;
}

// Function to format date as 'DD.MM.YYYY'
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
