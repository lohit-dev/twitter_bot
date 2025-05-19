import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { fetchHighVolumeOrders } from "./services/metrics";
import { twitterService } from "./services/twitter";
import { generateMetricsImage } from "./utils/image_generator";
import { SuccessfulOrder } from "./types";
import { getAssetInfo, HashiraNetworkResponse } from "./services/api";

// Load environment variables
dotenv.config();

// Configuration
const POLLING_INTERVAL_MS = 10 * 1000;
const ORDERS_PER_POLL = 5;
const VOLUME_THRESHOLD = process.env.VOLUME_THRESHOLD
  ? parseFloat(process.env.VOLUME_THRESHOLD)
  : 300;

const processedOrderIds = new Set<string>();

/**
 * Processes a high volume order by generating an image and posting to Twitter
 * @param order The high volume order to process
 */
async function processHighVolumeOrder(order: SuccessfulOrder): Promise<void> {
  try {
    logger.info(`Processing high volume order: ${order.create_order_id}`);

    // Generate tweet message
    const tweetMessage = `🚨 High Swap Alert! 🚨\n\n${order.volume.toFixed(2)} USD from ${order.source_chain} to ${order.destination_chain}\n\n#DeFi #Crypto #CrossChain`;

    // Generate order image
    const imagePath = await generateMetricsImage(order, "garden");

    // Post to Twitter
    const response = await twitterService.postTweet(tweetMessage, imagePath);
    logger.info(`Successfully posted to Twitter with ID: ${response.id}`);

    // Mark order as processed
    processedOrderIds.add(order.create_order_id);
  } catch (error) {
    logger.error("Error processing high volume order:", error);
  }
}

/**
 * Polls for high volume orders and processes them
 * @param networkInfo The cached network information
 */
async function pollForHighVolumeOrders(
  networkInfo: HashiraNetworkResponse
): Promise<void> {
  try {
    logger.info(
      `Polling for high volume orders with threshold: ${VOLUME_THRESHOLD}`
    );

    logger.info("Fetching...");
    // Fetch high volume orders
    const highVolumeOrders = await fetchHighVolumeOrders(
      VOLUME_THRESHOLD,
      processedOrderIds,
      networkInfo
    );

    // Process each high volume order
    for (const order of highVolumeOrders.slice(0, ORDERS_PER_POLL)) {
      await processHighVolumeOrder(order);
    }
  } catch (error) {
    logger.error("Error polling for high volume orders:", error);
  } finally {
    // Schedule next poll
    setTimeout(() => pollForHighVolumeOrders(networkInfo), POLLING_INTERVAL_MS);
  }
}

/**
 * Main function to start the Twitter bot
 */
async function main(): Promise<void> {
  try {
    logger.info("Starting Twitter bot for high volume orders");

    // Fetch network information once at startup
    const networkInfo = await getAssetInfo(
      "https://api.garden.finance/info/assets"
    );
    logger.info("Network information cached for future use");

    // Check Twitter authentication
    const authStatus = twitterService.getStatus();
    if (!authStatus.authenticated) {
      logger.warn("Twitter is not authenticated. Please authenticate first.");
    } else {
      logger.info(
        "Twitter is authenticated. Starting polling for high volume orders."
      );
    }

    pollForHighVolumeOrders(networkInfo);
  } catch (error) {
    logger.error("Error starting Twitter bot:", error);
    process.exit(1);
  }
}

main();
