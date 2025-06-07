import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios = require("axios"); // CommonJS import for axios

const TWELEVEDATA_BASE_URL = "https://api.twelvedata.com";

export async function GetStockPrice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: { symbol?: string } = {};
if (request.method === "POST") {
  try {
    body = await request.json();
  } catch (err) {
    context.warn("Failed to parse JSON body, skipping:", err);
  }
}

 const tickerSymbol = request.query.get("symbol") || body?.symbol;
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!tickerSymbol) {
    return {
      status: 400,
      body: "Missing 'ticker' query parameter or body field. Please provide a stock ticker symbol (e.g., MSFT).",
    };
  }

  if (!apiKey) {
    return {
      status: 500,
      body: "Twelve Data API key is not set in environment variables.",
    };
  }

  try {
    const priceRes = await axios.get(`${TWELEVEDATA_BASE_URL}/price`, {
      params: {
        symbol: tickerSymbol,
        apikey: apiKey,
      },
      timeout: 10000,
    });

    const priceData = priceRes.data as { price?: string; symbol?: string; name?: string; exchange?: string };

    if (!priceData || priceData.price === undefined || priceData.price === null) {
        context.warn(`Price data not found or invalid for ticker: ${tickerSymbol}. Response: ${JSON.stringify(priceData)}`);
        return {
            status: 404,
            body: `Price data not available for ticker: '${tickerSymbol}'. Check symbol or API plan.`,
        };
    }

    return {
      status: 200,
      jsonBody: {
        symbol: priceData.symbol || tickerSymbol,
        company: priceData.name || "N/A",
        exchange: priceData.exchange || "N/A",
        price: priceData.price,
      },
    };
  } catch (err: any) {
    context.error(`Error fetching price for ${tickerSymbol}:`, err?.message ?? err);

    // --- REVISED ERROR HANDLING ---
    // Check if the error is an AxiosError by looking for common properties.
    // An Axios timeout error will typically have a 'code' of 'ECONNABORTED'
    // and its message will often contain 'timeout'.
    if (err && typeof err === 'object' && 'isAxiosError' in err && err.isAxiosError &&
        (err.code === 'ECONNABORTED' || err.message.includes('timeout'))) {
        return {
            status: 504, // Gateway Timeout
            body: `Request to Twelve Data API timed out for ticker: '${tickerSymbol}'.`,
        };
    }
    // Check for other common Axios errors (e.g., network issues)
    if (err && typeof err === 'object' && 'isAxiosError' in err && err.isAxiosError && err.response) {
        // Axios error with a response (e.g., 4xx, 5xx from the API)
        const status = err.response.status || 500;
        const data = err.response.data ? JSON.stringify(err.response.data) : "No data";
        context.error(`Twelve Data API responded with error status ${status}: ${data}`);
        return {
            status: status,
            body: `Twelve Data API error for ticker '${tickerSymbol}': ${data}`,
        };
    }

    // Generic error for anything else unexpected
    return {
      status: 500,
      body: `An unexpected error occurred while fetching price for ticker '${tickerSymbol}'.`,
    };
  }
}

app.http("GetStockPrice", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: GetStockPrice,
});