import { logger } from "../utils/logger";
import { SuccessfulOrder } from "../types";
import { getAssetInfo, getMatchedOrder, HashiraNetworkResponse } from "./api";
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
  networkInfo: HashiraNetworkResponse
): number {
  try {
    const networkData = networkInfo[chain];
    if (networkData && networkData.assetConfig) {
      for (const assetConfig of networkData.assetConfig) {
        if (
          assetConfig.atomicSwapAddress &&
          assetConfig.atomicSwapAddress.toLowerCase() === asset.toLowerCase()
        ) {
          return assetConfig.decimals;
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
export async function convertToSuccessfulOrder(
  matchedOrder: MatchedOrder,
  networkInfo: HashiraNetworkResponse
): Promise<SuccessfulOrder | null> {
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

    // Get the network info for the source chain
    const sourceNetworkInfo = networkInfo[sourceChain];
    if (!sourceNetworkInfo) {
      logger.warn(`Network info not found for chain: ${sourceChain}`);
      return null;
    }

    // logger.info(`Network info for ${sourceChain}:`, sourceNetworkInfo);

    // Find the asset config in networkInfo
    const sourceAssetConfig = sourceNetworkInfo.assetConfig?.find(
      (asset) =>
        asset.symbol === sourceAssetSymbol ||
        asset.tokenAddress?.toLowerCase() === sourceAssetSymbol.toLowerCase()
    );

    // logger.info(
    //   `Found asset config for ${sourceAssetSymbol}:`,
    //   sourceAssetConfig
    // );

    // If we found a config, use its values, otherwise use the token address as symbol
    const sourceSymbol = sourceAssetConfig?.symbol || sourceAssetSymbol;
    const sourceName = sourceAssetConfig?.name || sourceSymbol;
    const sourceTokenAddress =
      sourceAssetConfig?.tokenAddress || sourceAssetSymbol;

    const srcAsset = {
      chain: sourceChain as Chain,
      symbol: sourceSymbol,
      decimals: getDecimals(
        {
          chain: sourceChain,
          asset: sourceAssetSymbol,
        },
        networkInfo
      ),
      name: sourceName,
      atomicSwapAddress:
        sourceAssetConfig?.atomicSwapAddress || sourceTokenAddress,
      tokenAddress: sourceTokenAddress,
    } as Asset;

    // logger.info("------------------------");
    // logger.info(
    //   `Source Asset constructed: ${JSON.stringify(srcAsset, null, 2)}`
    // );
    // logger.info("------------------------");

    // Find the destination asset config
    const destChain = matchedOrder.create_order.destination_chain;
    const destAssetSymbol = matchedOrder.create_order.destination_asset;

    // Get the network info for the destination chain
    const destNetworkInfo = networkInfo[destChain];
    if (!destNetworkInfo) {
      logger.warn(`Network info not found for chain: ${destChain}`);
      return null;
    }

    // logger.info(`Network info for ${destChain}:`, destNetworkInfo);

    // Find the asset config in networkInfo that matches either the symbol or token address
    const destAssetConfig = destNetworkInfo.assetConfig?.find(
      (asset) =>
        asset.symbol === destAssetSymbol ||
        asset.tokenAddress?.toLowerCase() === destAssetSymbol.toLowerCase() ||
        asset.atomicSwapAddress?.toLowerCase() === destAssetSymbol.toLowerCase()
    );

    // logger.info(`Found asset config for ${destAssetSymbol}:`, destAssetConfig);

    if (!destAssetConfig) {
      logger.warn(
        `No asset config found for ${destAssetSymbol} on chain ${destChain}`
      );
      return null;
    }

    const destAsset = {
      chain: destChain as Chain,
      symbol: destAssetConfig.symbol,
      decimals: destAssetConfig.decimals,
      name: destAssetConfig.name,
      atomicSwapAddress: destAssetConfig.atomicSwapAddress,
      tokenAddress: destAssetConfig.tokenAddress,
    } as Asset;

    // logger.info("------------------------");
    // logger.info(
    //   `Destination Asset constructed: ${JSON.stringify(destAsset, null, 2)}`
    // );
    // logger.info("------------------------");

    // First get comparison results
    let comparisonResults;
    try {
      comparisonResults = await compareWithOtherServices(
        srcAsset,
        destAsset,
        sourceAmount,
        gardenFee,
        gardenSwapTime
      );

      // logger.info(`Comparison results obtained:
      //   timeSaved: ${comparisonResults.timeSaved}
      //   feeSaved: ${comparisonResults.feeSaved}
      //   totalAmountOthersMax: ${comparisonResults.totalAmountOthersMax}
      //   totalTimeOfOthersMax: ${comparisonResults.totalTimeOfOthersMax}
      // `);
    } catch (error) {
      logger.error("Error getting comparison results:", error);
      comparisonResults = {
        timeSaved: "0m 0s",
        timeSavedMinutes: 0,
        feeSaved: 0,
        totalAmountOthersMax: "$0",
        totalTimeOfOthersMax: "0s",
      };
    }

    // Now construct the successful order with comparison results
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
      // Set comparison metrics from the results
      timeSaved: comparisonResults.timeSaved,
      timeSavedMinutes: comparisonResults.timeSavedMinutes,
      feeSaved: comparisonResults.feeSaved,
      totalAmountOthersMax: comparisonResults.totalAmountOthersMax,
      totalTimeOfOthersMax: comparisonResults.totalTimeOfOthersMax,
    };

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
  networkInfo?: HashiraNetworkResponse
): Promise<SuccessfulOrder[]> {
  try {
    // logger.info("Fetching new high-volume orders...");

    if (!networkInfo) {
      const apiUrl =
        process.env.NETWORK_API_URL ||
        "http://api.garden.finance/info/assets/mainnet";
      // logger.info(`Fetching network info from ${apiUrl}`);
      networkInfo = await getAssetInfo(apiUrl);
    }

    try {
      const highVolumeOrders: SuccessfulOrder[] = [];
      const pageSize = process.env.PAGE_SIZE
        ? parseInt(process.env.PAGE_SIZE)
        : 1;
      const page = process.env.PAGE_NUMBER
        ? parseInt(process.env.PAGE_NUMBER)
        : 1;

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

        const successfulOrder = await convertToSuccessfulOrder(
          order,
          networkInfo
        );

        if (!successfulOrder) {
          logger.info(`Failed to convert order ID: ${orderId}`);
          continue;
        }

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
