import { logger } from "../utils/logger";
import { SuccessfulOrder } from "../types";
import { getAssetInfo, getMatchedOrder, NetworkInfo } from "./api";
import { formatCurrency } from "../utils/formatters";
import { MatchedOrder, Asset, Chain } from "@gardenfi/orderbook";
import { compareWithOtherServices } from "./compareService";

/**
 * Gets time estimates for different chains
 * @param chain The chain name
 * @returns Object with timeString and timeMinutes
 */
function getTimeEstimates(chain: string): {
  timeString: string;
  timeMinutes: number;
} {
  if (chain.toLowerCase() === "bitcoin" || chain.toLowerCase() === "btc") {
    return { timeString: "~10m", timeMinutes: 10 };
  }
  // For EVM chains (Ethereum, Arbitrum, etc.)
  return { timeString: "~30s", timeMinutes: 0.5 };
}

/**
 * Gets the decimal places for a specific asset
 * @param chain The chain name
 * @param asset The asset symbol or address
 * @param networkInfo The network information from the API
 * @returns The number of decimal places for the asset
 */
function getDecimals(
  { chain, asset }: { chain: string; asset: string },
  networkInfo: NetworkInfo
): number {
  try {
    const normalizedChain = chain.toLowerCase();

    // Find the network that matches the chain
    for (const [networkId, network] of Object.entries(networkInfo)) {
      if (network.name.toLowerCase() === normalizedChain) {
        for (const assetConfig of network.assetConfig) {
          if (
            assetConfig.symbol.toLowerCase() === asset.toLowerCase() ||
            assetConfig.tokenAddress.toLowerCase() === asset.toLowerCase()
          ) {
            return assetConfig.decimals;
          }
        }
      }
    }

    logger.warn(
      `Could not find decimals for ${chain}:${asset}, using default of 8`
    );
    return 8;
  } catch (error) {
    logger.error(`Error getting decimals for ${chain}:${asset}:`, error);
    return 8;
  }
}

/**
 * Converts a MatchedOrder to a SuccessfulOrder with volume calculation
 * @param matchedOrder The matched order from the API
 * @param networkInfo Network information for decimal calculation
 * @returns A SuccessfulOrder with calculated volume
 */
function convertToSuccessfulOrder(
  matchedOrder: MatchedOrder,
  networkInfo: NetworkInfo
): SuccessfulOrder | null {
  try {
    if (
      !matchedOrder.source_swap.redeem_tx_hash ||
      !matchedOrder.destination_swap.redeem_tx_hash
    ) {
      return null;
    }

    const sourceAmount =
      Number(matchedOrder.source_swap.amount) /
      Math.pow(
        10,
        getDecimals(
          {
            chain: matchedOrder.create_order.source_chain,
            asset: matchedOrder.create_order.source_asset,
          },
          networkInfo
        )
      );

    const destinationAmount =
      Number(matchedOrder.destination_swap.amount) /
      Math.pow(
        10,
        getDecimals(
          {
            chain: matchedOrder.create_order.destination_chain,
            asset: matchedOrder.create_order.destination_asset,
          },
          networkInfo
        )
      );

    const inputTokenPrice =
      matchedOrder.create_order.additional_data.input_token_price || 0;
    const outputTokenPrice =
      matchedOrder.create_order.additional_data.output_token_price || 0;

    // Calculate volume (in USD)
    const volume =
      sourceAmount * inputTokenPrice + destinationAmount * outputTokenPrice;

    // Calculate Garden's actual fee in USD (difference between input and output amounts)
    const gardenFee = sourceAmount - destinationAmount;

    // Get Garden's swap time estimate based on the source chain
    const gardenTimeEstimate = getTimeEstimates(
      matchedOrder.create_order.source_chain
    );
    const gardenSwapTime = gardenTimeEstimate.timeString;

    // Get source and destination asset information
    // Find the asset config from networkInfo
    const sourceChain = matchedOrder.create_order.source_chain;
    const sourceAssetSymbol = matchedOrder.create_order.source_asset;

    // Find the asset config in networkInfo
    const sourceAssetConfig = networkInfo.assetConfig.find(
      (asset) => asset.symbol === sourceAssetSymbol
    );

    const srcAsset = {
      chain: sourceChain as Chain,
      symbol: sourceAssetSymbol,
      decimals: getDecimals(
        {
          chain: sourceChain,
          asset: sourceAssetSymbol,
        },
        networkInfo
      ),
      name: sourceAssetConfig?.name || sourceAssetSymbol,
      atomicSwapAddress: sourceAssetConfig?.atomicSwapAddress || "",
      tokenAddress: sourceAssetConfig?.tokenAddress || "",
    } as Asset;

    // Find the destination asset config
    const destChain = matchedOrder.create_order.destination_chain;
    const destAssetSymbol = matchedOrder.create_order.destination_asset;

    // Find the asset config in networkInfo
    const destAssetConfig = networkInfo.assetConfig.find(
      (asset) => asset.symbol === destAssetSymbol
    );

    const destAsset = {
      chain: destChain as Chain,
      symbol: destAssetSymbol,
      decimals: getDecimals(
        {
          chain: destChain,
          asset: destAssetSymbol,
        },
        networkInfo
      ),
      name: destAssetConfig?.name || destAssetSymbol,
      atomicSwapAddress: destAssetConfig?.atomicSwapAddress || "",
      tokenAddress: destAssetConfig?.tokenAddress || "",
    } as Asset;

    // Compare with other services (this will be an async call)
    // For now, we'll return the basic order and update it later with the comparison results
    const successfulOrder = {
      create_order_id: matchedOrder.create_order.create_id,
      source_chain: matchedOrder.create_order.source_chain,
      source_asset: matchedOrder.create_order.source_asset,
      destination_chain: matchedOrder.create_order.destination_chain,
      destination_asset: matchedOrder.create_order.destination_asset,
      source_amount: sourceAmount.toString(),
      destination_amount: destinationAmount.toString(),
      input_token_price: inputTokenPrice,
      output_token_price: outputTokenPrice,
      created_at: matchedOrder.created_at,
      timestamp: new Date(matchedOrder.created_at).toISOString(),
      volume,
      source_swap_amount: matchedOrder.source_swap.amount,
      destination_swap_amount: matchedOrder.destination_swap.amount,
      // Initialize comparison metrics with default values
      // These will be updated by the compareWithOtherServices call with the actual max values from other services
      timeSaved: "0m 0s",
      timeSavedMinutes: 0,
      feeSaved: 0,
      // These will be set to the maximum fee and time from other services after comparison
      totalAmountOthersMax: "$0",
      totalTimeOfOthersMax: "0s",
    };

    compareWithOtherServices(
      srcAsset,
      destAsset,
      sourceAmount,
      gardenFee,
      gardenSwapTime
    )
      .then((comparisonResults) => {
        successfulOrder.timeSaved = comparisonResults.timeSaved;
        successfulOrder.timeSavedMinutes = comparisonResults.timeSavedMinutes;
        successfulOrder.feeSaved = comparisonResults.feeSaved;
        successfulOrder.totalAmountOthersMax =
          comparisonResults.totalAmountOthersMax;
        successfulOrder.totalTimeOfOthersMax =
          comparisonResults.totalTimeOfOthersMax;
      })
      .catch((error) => {
        logger.error("Error updating order with comparison results:", error);
      });

    return successfulOrder;
  } catch (error) {
    logger.error(`Error converting matched order to successful order:`, error);
    return null;
  }
}

/**
 * Fetches new successful orders and returns those with volume above the threshold
 * @param volumeThreshold Minimum volume threshold to consider an order significant
 * @param processedOrderIds Set of already processed order IDs to avoid duplicates
 * @param networkInfo Pre-fetched network information to avoid redundant API calls
 * @returns Array of new high-volume successful orders
 */
export async function fetchHighVolumeOrders(
  volumeThreshold: number = 100,
  processedOrderIds: Set<string> = new Set(),
  networkInfo?: any
): Promise<SuccessfulOrder[]> {
  try {
    logger.info("Fetching new high-volume orders...");

    if (!networkInfo) {
      const apiUrl =
        process.env.NETWORK_API_URL || "https://api.garden.finance/info/assets";
      logger.info(`Fetching network info from ${apiUrl}`);
      networkInfo = await getAssetInfo(apiUrl);
    }

    try {
      const highVolumeOrders: SuccessfulOrder[] = [];
      const pageSize = process.env.PAGE_SIZE
        ? parseInt(process.env.PAGE_SIZE)
        : 2;
      const page = process.env.PAGE_NUMBER
        ? parseInt(process.env.PAGE_NUMBER)
        : 1;

      logger.info(
        `Fetching matched orders page ${page} with ${pageSize} items per page`
      );
      const matchedOrdersResponse = await getMatchedOrder(pageSize, page);
      const matchedOrders = matchedOrdersResponse.data;

      if (!Array.isArray(matchedOrders)) {
        logger.info("Matched orders data is not an array");
        return [];
      }

      if (matchedOrders.length === 0) {
        logger.info("No orders found in the response");
        return [];
      }

      logger.info(`Received ${matchedOrders.length} orders in the response`);

      // Log all matched orders with their IDs
      logger.info(
        `Found ${matchedOrders.length} matched orders: ${matchedOrders
          .map((order) => order.create_order.create_id)
          .join(", ")}`
      );

      // Process each matched order
      for (const order of matchedOrders) {
        const orderId = order.create_order.create_id;

        // Log the current order being processed
        logger.info(`Processing order ID: ${orderId}`);

        // Skip already processed orders
        if (processedOrderIds.has(orderId)) {
          logger.info(`Skipping already processed order ID: ${orderId}`);
          continue;
        }

        // Log order details before conversion
        logger.info(
          `Converting order ${orderId} - Source: ${order.create_order.source_chain}:${order.create_order.source_asset}, ` +
            `Destination: ${order.create_order.destination_chain}:${order.create_order.destination_asset}`
        );

        const successfulOrder = convertToSuccessfulOrder(order, networkInfo);

        if (!successfulOrder) {
          logger.info(`Failed to convert order ID: ${orderId}`);
          continue;
        }

        logger.info(
          `Order ${orderId} converted successfully with volume: ${formatCurrency(successfulOrder.volume)}`
        );

        if (successfulOrder.volume >= volumeThreshold) {
          highVolumeOrders.push(successfulOrder);
          logger.info(
            `Found high-volume order ID: ${orderId} with volume: ${formatCurrency(successfulOrder.volume)}`
          );
        } else {
          logger.info(
            `Order ID: ${orderId} volume (${formatCurrency(successfulOrder.volume)}) below threshold (${formatCurrency(volumeThreshold)})`
          );
        }
      }

      logger.info(
        `Found ${highVolumeOrders.length} new high-volume orders exceeding threshold of ${formatCurrency(volumeThreshold)}`
      );

      highVolumeOrders.sort((a, b) => b.volume - a.volume);

      return highVolumeOrders;
    } catch (error) {
      logger.error(`Error fetching matched orders:`, error);
      return [];
    }
  } catch (error) {
    logger.error("Error fetching high-volume orders:", error);
    return [];
  }
}
