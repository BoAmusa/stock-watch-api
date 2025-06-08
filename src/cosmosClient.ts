// This file sets up a singleton Cosmos DB client and exports it for use in other parts of the application.
import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOSDB_CONNECTION!;
const databaseName = process.env.DB_ID;
const containerName = process.env.CONTAINER_ID;

// Singleton Cosmos client & container
const client = new CosmosClient(connectionString);
const database = client.database(databaseName);
const container = database.container(containerName);

export { client, database, container };
