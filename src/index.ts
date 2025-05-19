import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { fetchHighVolumeOrders } from "./services/metrics";
import { twitterService } from "./services/twitter";
import { generateMetricsImage } from "./utils/image_generator";
import { SuccessfulOrder } from "./types";
import { getAssetInfo, HashiraNetworkResponse } from "./services/api";
import * as fs from "fs/promises";

// Load environment variables
dotenv.config();

// Configuration
const POLLING_INTERVAL_MS = 10 * 1000;
const ORDERS_PER_POLL = 5;
const VOLUME_THRESHOLD = process.env.VOLUME_THRESHOLD
  ? parseFloat(process.env.VOLUME_THRESHOLD)
  : 300;

// Initialize processed orders set
const processedOrderIds = new Set<string>();

// Save processed orders to file
async function saveProcessedOrders() {
  await fs.writeFile(
    "processed_orders.json",
    JSON.stringify([...processedOrderIds])
  );
}

// Load processed orders from storage
async function loadProcessedOrders() {
  try {
    const processedOrders = await fs.readFile("processed_orders.json", "utf8");
    JSON.parse(processedOrders).forEach((id: string) =>
      processedOrderIds.add(id)
    );
    logger.info(`Loaded ${processedOrderIds.size} processed orders`);
  } catch (error) {
    logger.info("No existing processed orders found");
  }
}

/**
 * Processes a high volume order by generating an image and posting to Twitter
 * @param order The high volume order to process
 */
async function processHighVolumeOrder(order: SuccessfulOrder): Promise<void> {
  try {
    // Skip if already processed
    if (processedOrderIds.has(order.create_order_id)) {
      logger.info(`Skipping already processed order: ${order.create_order_id}`);
      return;
    }

    logger.info(`Processing high volume order: ${order.create_order_id}`);

    // Verify we have valid comparison data
    if (
      !order.feeSaved ||
      !order.timeSaved ||
      !order.totalTimeOfOthersMax ||
      !order.totalAmountOthersMax
    ) {
      logger.warn(`Skipping order ${order.create_order_id} - Missing comparison data:
        feeSaved: ${order.feeSaved}
        timeSaved: ${order.timeSaved}
        totalTimeOfOthersMax: ${order.totalTimeOfOthersMax}
        totalAmountOthersMax: ${order.totalAmountOthersMax}
      `);
      return;
    }

    // Only proceed if we have meaningful comparisons (fee saved > 0)
    if (order.feeSaved <= 0) {
      logger.info(
        `Skipping order ${order.create_order_id} - No fee savings (${order.feeSaved})`
      );
      return;
    }

    // Generate tweet message
    const tweetMessage = `🚨 High Swap Alert! 🚨\n\n${order.volume.toFixed(2)} USD from ${order.source_chain} to ${order.destination_chain}\n\n#DeFi #Crypto #CrossChain`;

    // Generate order image
    logger.info(
      `Generating image for order ${order.create_order_id} with comparison data`
    );
    const imagePath = await generateMetricsImage(order, "garden");

    // {"create_order_id":"bd4d1c864119c7bad2dde31b0b64e4bef77e9a68a1e16433f9c845dc53e7d9af","created_at":"2025-05-19T09:08:09.810539Z","destination_amount":"0.00011964","destination_asset":"0x795dcb58d1cd4789169d5f938ea05e17eceb68ca","destination_chain":"ethereum","destination_swap_amount":"11964","feeSaved":2.09037664,"input_token_price":103281.95450855308,"output_token_price":103281.95450855308,"service":"swap-metrics-bot","source_amount":"0.00012","source_asset":"primary","source_chain":"bitcoin","source_swap_amount":"12000","timeSaved":"+10m 0s","timeSavedMinutes":10,"timestamp":"2025-05-19T09:08:09.810Z","totalAmountOthersMax":"relay","totalTimeOfOthersMax":"20m 0s","volume":24.750487578429663}

    // Post to Twitter
    const response = await twitterService.postTweet(tweetMessage, imagePath);
    logger.info(`Successfully posted to Twitter with ID: ${response.id}`);

    // Mark order as processed and save to file
    processedOrderIds.add(order.create_order_id);
    await saveProcessedOrders();
  } catch (error) {
    logger.error(`Error processing order ${order.create_order_id}:`, error);
  }
}

// Main polling function
async function startPolling() {
  // Load processed orders first
  await loadProcessedOrders();

  // Start polling loop
  while (true) {
    try {
      const orders = await fetchHighVolumeOrders(
        VOLUME_THRESHOLD,
        processedOrderIds
      );

      for (const order of orders.slice(0, ORDERS_PER_POLL)) {
        await processHighVolumeOrder(order);
      }
    } catch (error) {
      logger.error("Error in polling loop:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
  }
}

// Start the bot
startPolling().catch((error) => {
  logger.error("Fatal error in bot:", error);
  process.exit(1);
});
