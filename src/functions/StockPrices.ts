import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import axios = require("axios");
import { verifyUserEmail } from "../auth/authUtils";
import { StockInfo, TwelveDataBatchResponse } from "../types/userDB.types";

const TWELEVEDATA_BASE_URL = "https://api.twelvedata.com";

export async function GetStockPrices(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (!verifyUserEmail(request)) {
    return {
      status: 401,
      body: "Unauthorized: User verification failed.",
    };
  }

  let body: { symbols?: string[] } = {};
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch (err) {
      context.warn("Failed to parse JSON body:", err);
    }
  }

  const querySymbols = request.query.get("symbols");
  const symbols =
    body.symbols || (querySymbols?.split(",").map((s) => s.trim()) ?? []);
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!symbols.length) {
    return {
      status: 400,
      body: "Missing 'symbols' query param or JSON body. Provide a list of stock symbols.",
    };
  }

  if (!apiKey) {
    return {
      status: 500,
      body: "Twelve Data API key not set in environment variables.",
    };
  }

  try {
    const batchRequestBody = symbols.reduce((acc, symbol) => {
      acc[`req_${symbol}`] = {
        url: `/time_series?symbol=${symbol}&interval=1min&apikey=${apiKey}`,
      };
      return acc;
    }, {} as Record<string, { url: string }>);

    const priceRes = await axios.post<TwelveDataBatchResponse>(
      `${TWELEVEDATA_BASE_URL}/batch`,
      batchRequestBody,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const batchData = priceRes.data?.data ?? {};
    const formattedResults = Object.entries(batchData)
      .map(([key, result]) => {
        if (
          result?.status !== "success" ||
          result?.response?.status !== "ok" ||
          !result.response.values?.[0]
        ) {
          context.warn(
            `Skipping invalid or missing data for key: ${key}`,
            result
          );
          return null;
        }

        const values = result.response.values[0];
        const meta = result.response.meta;

        const close = parseFloat(values.close);
        const open = parseFloat(values.open);
        const change = close - open;
        const percentChange = (change / open) * 100;

        return {
          symbol: meta.symbol,
          companyName: "", // Optionally populate from map
          price: close,
          change,
          percentChange,
          currency: meta.currency ?? "USD",
        };
      })
      .filter((item): item is StockInfo => item !== null);

    return {
      status: 200,
      jsonBody: formattedResults,
    };
  } catch (err: any) {
    context.error(`Error fetching batch prices:`, err?.message ?? err);

    if (
      err?.isAxiosError &&
      (err.code === "ECONNABORTED" || err.message?.includes("timeout"))
    ) {
      return {
        status: 504,
        body: "Request to Twelve Data API timed out.",
      };
    }

    if (err?.isAxiosError && err.response) {
      const status = err.response.status || 500;
      const data = JSON.stringify(err.response.data ?? "No response data");
      context.error(`Twelve Data API error: ${status} - ${data}`);
      return {
        status,
        body: `Twelve Data API error: ${data}`,
      };
    }

    return {
      status: 500,
      body: "Unexpected error occurred while fetching stock prices.",
    };
  }
}

app.http("StockPrices", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetStockPrices,
});
