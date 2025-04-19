require('dotenv').config();

// API Constants
const API_URL = "https://api.novaposhta.ua/v2.0/json/";
const EXCLUDE_LIST = ["20451026879542", "20451032573965"];

// Helper function to get date N days back
function getDateFromDaysBack(daysBack) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date;
}

// Function to format date as 'DD.MM.YYYY'
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Create request data object
function createRequestData(daysFrom = 15, daysTo = 0) {
  return {
    apiKey: process.env.NP_API_KEY,
    modelName: "InternetDocumentGeneral",
    calledMethod: "getDocumentList",
    methodProperties: {
      DateTimeFrom: formatDate(getDateFromDaysBack(daysFrom)),
      DateTimeTo: formatDate(getDateFromDaysBack(daysTo)),
      GetFullList: "1",
    },
  };
}

async function fetchTTNList(url = API_URL, data = createRequestData()) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    // Sort result by date
    result.data.sort(
      (a, b) => new Date(b.RecipientDateTime) - new Date(a.RecipientDateTime)
    );

    const removeTime = (dateString) => dateString.split(" ")[0];

    let resultString = "";

    for (const item of result.data) {
      if (![9, 10, 11].includes(item.StateId)) continue; // proceed received states only
      if (EXCLUDE_LIST.includes(item.IntDocNumber)) continue; // skip excludes

      const afterPayment = +item.AfterpaymentOnGoodsCost;
      const backwardDelivery = +item.BackwardDeliverySum || +item.BackwardDeliveryMoney;

      if (!afterPayment && !backwardDelivery) continue; // skip no afterpayment

      resultString += `${removeTime(item.RecipientDateTime)} - ${
        afterPayment || `${backwardDelivery} cash`
      }${/Пункт приймання-видачі/i.test(item.RecipientAddressDescription) ? ' delay' : ''} - ${item.IntDocNumber}\n`;
    }

    return resultString;
  } catch (error) {
    console.error("Error in fetchTTNList:", error);
    throw new Error("Failed to load TTN list data.");
  }
}

module.exports = {
  fetchTTNList,
  createRequestData,
  getDateFromDaysBack,
  formatDate,
  API_URL,
  EXCLUDE_LIST
};
