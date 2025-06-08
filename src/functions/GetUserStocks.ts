import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../cosmosClient"; // Import the Cosmos DB container

export async function GetUserStocks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const userId = request.query.get("userId");

  if (!userId) {
    return {
      status: 400,
      body: "Missing userId parameter",
    };
  }

  try {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [{ name: "@userId", value: userId }],
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    return {
      status: 200,
      jsonBody: resources,
    };
  } catch (error: any) {
    context.error("Error querying Cosmos DB:", error.message || error);
    return {
      status: 500,
      body: "Failed to fetch user stocks.",
    };
  }
}

app.http("UserStocks", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetUserStocks,
});
