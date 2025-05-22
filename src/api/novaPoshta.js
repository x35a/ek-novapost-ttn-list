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
// entry https://developers.novaposhta.ua/documentation



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
    // Add 3 seconds delay for testing
    // await new Promise(resolve => setTimeout(resolve, 5000));

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

    const removeTime = (dateString) => dateString ? dateString.split(" ")[0] : '';

    let resultString = "";

    for (const item of result.data) {
      //if (item.IntDocNumber === "20451041678671") console.log(item);

      // AfterpaymentOnGoodsCost // string value. payment sum to fop.
      // BackwardDeliverySum // string value. cash delivery to the office.
      // BackwardDeliveryMoney // number value. the same value as BackwardDeliverySum. diff to BackwardDeliverySum is unknown.
      // StateId https://developers.novaposhta.ua/view/model/a99d2f28-8512-11ec-8ced-005056b2dbe1/method/a9ae7bc9-8512-11ec-8ced-005056b2dbe1

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
