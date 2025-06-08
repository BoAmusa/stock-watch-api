import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { container } from "../cosmosClient";

export async function DeleteUserStock(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`DELETE request received: ${request.url}`);

  try {
    const userId = request.query.get("userId");
    const stockId = request.query.get("stockId");

    if (!userId || !stockId) {
      return {
        status: 400,
        body: "Missing 'userId' or 'stockId' in query parameters.",
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
