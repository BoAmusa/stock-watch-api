import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import * as axios from "axios";
import { verifyUserEmail } from "../auth/authUtils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export async function GetStockInfoFH(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (!verifyUserEmail(request)) {
    return {
      status: 401,
      body: "Unauthorized: User verification failed.",
    };
  }

  let symbol = request.query.get("symbol")?.toUpperCase();

  // Try to parse from body if not in query (for POST requests)
  if (!symbol) {
    try {
      const body = (await request.json()) as { symbol?: string };
      symbol = body?.symbol?.toUpperCase();
    } catch {
      // no body or invalid json, ignore
    }
  }

  if (!symbol) {
    return {
      status: 400,
      body: "Missing 'symbol' query parameter or body field.",
    };
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      body: "Finnhub API key is not set in environment variables.",
    };
  }

  try {
    // Fetch quote (price data)
    const quoteRes = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { symbol: symbol, token: apiKey },
      timeout: 10000,
    });

    // Fetch company profile (logo and company name)
    const profileRes = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
      params: { symbol: symbol, token: apiKey },
      timeout: 10000,
    });

    type QuoteData = {
      c?: number; // current price
      d?: number; // price change
      dp?: number; // percent change
    };

    type ProfileData = {
      name?: string;
      logo?: string;
      currency?: string;
    };

    const quoteData = quoteRes.data as QuoteData;
    const profileData = profileRes.data as ProfileData;

    if (!quoteData || quoteData.c === undefined) {
      return {
        status: 404,
        body: `Price data not found for symbol: '${symbol}'.`,
      };
    }

    return {
      status: 200,
      jsonBody: {
        symbol: symbol.toUpperCase(),
        companyName: profileData.name || "N/A",
        logo: profileData.logo || null,
        price: quoteData.c, // current price
        change: quoteData.d, // price change
        percentChange: quoteData.dp, // percent change
        currency: profileData.currency || "USD",
      },
    };
  } catch (err: any) {
    context.error(
      `Error fetching stock info for ${symbol}:`,
      err.message || err
    );

    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      return {
        status: 504,
        body: `Request to Finnhub API timed out for symbol: '${symbol}'.`,
      };
    }

    if (err.response) {
      return {
        status: err.response.status || 500,
        body: `Finnhub API error for symbol '${symbol}': ${JSON.stringify(
          err.response.data
        )}`,
      };
    }

    return {
      status: 500,
      body: `Unexpected error fetching stock info for symbol '${symbol}'.`,
    };
  }
}

app.http("StockInfoFH", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetStockInfoFH,
});
