import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { container } from "../cosmosClient"; // Import the Cosmos DB container
import { StockInfo, UserStockDocument } from "../types/userDB.types";
import { verifyUserEmail } from "../auth/authUtils";

export async function PostUserStock(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Processing stock POST request: ${request.url}`);

  if (!verifyUserEmail(request)) {
    return {
      status: 401,
      body: "Unauthorized: User verification failed.",
    };
  }

  try {
    const body = (await request.json()) as {
      userId: string;
      stock: StockInfo;
    };

    if (!body.userId || !body.stock?.symbol) {
      return {
        status: 400,
        body: "Missing userId or stock data in request body.",
      };
    }

    const newDoc: UserStockDocument = {
      id: `${body.stock.symbol}-${body.userId}`,
      userId: body.userId,
      stock: body.stock,
    };

    const { resource } = await container.items.upsert(newDoc);

    return {
      status: 201,
      jsonBody: {
        message: "Stock saved successfully.",
        data: resource,
      },
    };
  } catch (error: any) {
    context.error("Failed to save stock:", error.message);
    return {
      status: 500,
      body: "Failed to save stock to database.",
    };
  }
}

app.http("UserStock", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostUserStock,
});
