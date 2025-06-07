import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios = require("axios");

const TWELVE_DATA_API_URL = "https://api.twelvedata.com";
const API_KEY = process.env.TWELVE_DATA_API_KEY;

export async function GetStockInfo(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const querySymbol = request.query.get("symbol");

  if (!querySymbol) {
    return {
      status: 400,
      body: "Missing 'symbol' query parameter (e.g., ?symbol=AAPL)."
    };
  }

  if (!API_KEY) {
    return {
      status: 500,
      body: "Twelve Data API key is not set in environment variables."
    };
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_API_URL}/stocks`, {
      params: {
        symbol: querySymbol,
        apikey: API_KEY
      },
      timeout: 10000
    });

    const stockData = response.data as { data?: Array<{ symbol: string; name: string; exchange: string; type: string; currency: string; country: string }> };

    if (!stockData || !stockData.data || stockData.data.length === 0) {
      return {
        status: 404,
        body: `No stock info found for symbol '${querySymbol}'.`
      };
    }

    const stock = stockData.data[0]; // Return the first matched stock info

    return {
      status: 200,
      jsonBody: {
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange,
        type: stock.type,
        currency: stock.currency,
        country: stock.country
      }
    };
  } catch (err: any) {
    context.error(`Error fetching stock info: ${err?.message ?? err}`);
    return {
      status: 500,
      body: "Error retrieving stock info from Twelve Data."
    };
  }
}

app.http("GetStockInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetStockInfo
});
