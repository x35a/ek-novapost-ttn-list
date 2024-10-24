const http = require("http");

// request props
// https://developers.novaposhta.ua/view/model/a90d323c-8512-11ec-8ced-005056b2dbe1/method/a9d22b34-8512-11ec-8ced-005056b2dbe1
const url = "https://api.novaposhta.ua/v2.0/json/"; // entry https://developers.novaposhta.ua/documentation
const apiKey = process.env.NP_API_KEY;
const data = {
  apiKey: apiKey,
  modelName: "InternetDocumentGeneral",
  calledMethod: "getDocumentList", // get CREATED ttns in date range
  methodProperties: {
    DateTimeFrom: formatDate(getDaysBackDate(7)),
    DateTimeTo: formatDate(getDaysBackDate(0)),
    GetFullList: "1",
  },
};

const excludeList = [];

//create a server object:
http
  .createServer(async function (req, res) {
    res.write("LOADING DATA...\n");
    const ttnList = await fetchTTNList(url, data);
    res.write("LOADED\n\n");
    res.write(ttnList); //write a response to the client
    res.end(); //end the response
  })
  .listen(8080); //the server object listens on port 8080

async function fetchTTNList(url, data) {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await response.json();

  // sort result by date
  result.data.sort(
    (a, b) => new Date(b.RecipientDateTime) - new Date(a.RecipientDateTime)
  );

  const removeTime = (dateString) => dateString.split(" ")[0];

  let resultString = "";

  for (const item of result.data) {
    if (+item.AfterpaymentOnGoodsCost === 0) continue; // skip prepays
    if (![9, 10, 11].includes(item.StateId)) continue; // proceed received states only
    // state numbers https://developers.novaposhta.ua/view/model/a99d2f28-8512-11ec-8ced-005056b2dbe1/method/a9ae7bc9-8512-11ec-8ced-005056b2dbe1
    if (excludeList.includes(item.IntDocNumber)) continue; // skip excludes

    resultString += `${removeTime(item.RecipientDateTime)} - ${
      item.AfterpaymentOnGoodsCost
    } - ${item.IntDocNumber}\n`;
  }

  return resultString;
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
