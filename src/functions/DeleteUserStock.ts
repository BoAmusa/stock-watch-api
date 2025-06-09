import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { container } from "../cosmosClient";
import { verifyUserEmail } from "../auth/authUtils";

export async function DeleteUserStock(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`DELETE request received: ${request.url}`);

  if (!verifyUserEmail(request)) {
    return {
      status: 401,
      body: "Unauthorized: User verification failed.",
    };
  }

  try {
    const userId = request.query.get("userId");
    const stockSymbol = request.query.get("stockSymbol");
    const stockId = `${stockSymbol}-${userId}`;

    if (!userId || !stockSymbol) {
      return {
        status: 400,
        body: "Missing 'userId' or 'stockSymbol' in query parameters.",
      };
    }

    await container.item(stockId, userId).delete();

    return {
      status: 200,
      body: `Stock with ID '${stockId}' for user '${userId}' deleted successfully.`,
    };
  } catch (error: any) {
    context.error("Error deleting user stock:", error);
    return {
      status: 500,
      body: "Failed to delete stock.",
    };
  }
}

app.http("DeleteUserStock", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: DeleteUserStock,
});
