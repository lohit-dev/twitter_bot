import { logger } from "../utils/logger";
import { SuccessfulOrder } from "../types";
import { getAssetInfo, getMatchedOrder, NetworkInfo } from "./api";
import { formatCurrency } from "../utils/formatters";
import { MatchedOrder } from "@gardenfi/orderbook";

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
  networkInfo: any
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

    return {
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
    };
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

    // Only fetch network info if not provided (fallback)
    if (!networkInfo) {
      networkInfo = await getAssetInfo(
        "https://xcgg04skw4k044ws8swok4gw.65.109.18.60.sslip.io/networks"
      );
    }

    try {
      const highVolumeOrders: SuccessfulOrder[] = [];
      const pageSize = 2;
      const page = 1;

      logger.info(
        `Fetching matched orders page ${page} with ${pageSize} items per page`
      );
      const matchedOrdersResponse = await getMatchedOrder(pageSize, page);

      if (
        !Array.isArray(matchedOrdersResponse) ||
        matchedOrdersResponse.length === 0
      ) {
        logger.info("No new orders found");
        return [];
      }

      // Process each matched order
      for (const order of matchedOrdersResponse) {
        // Skip already processed orders
        if (processedOrderIds.has(order.create_order.create_id)) {
          continue;
        }

        const successfulOrder = convertToSuccessfulOrder(order, networkInfo);

        if (successfulOrder && successfulOrder.volume >= volumeThreshold) {
          highVolumeOrders.push(successfulOrder);
          logger.info(
            `Found high-volume order: ${formatCurrency(successfulOrder.volume)}`
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
