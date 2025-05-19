import { getMatchedOrder } from "../services/api";
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");

// Load environment variables
config();

async function extractRecentOrders() {
  try {
    console.log("Connecting to database to extract recent orders...");
    const orders = await getMatchedOrder(1);

    console.log(`Fetchedd successful orders in the last 24 hours`);

    // Save to file
    const filePath = path.join(
      __dirname,
      "..",
      "recent_successful_orders.json"
    );
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2));

    console.log(`Successfully saved orders to ${filePath}`);

    return orders;
  } catch (error) {
    console.error(`Error extracting recent orders:`, error);
    throw error;
  }
}

// Run the extraction
extractRecentOrders()
  .then(() => {
    console.log("Order extraction completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Failed to extract orders:`, error);
    process.exit(1);
  });
