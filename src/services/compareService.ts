import { Asset } from "@gardenfi/orderbook";
import { getChainflipFee } from "./timeAndFeeComparison/ChainFlipFees";
import { getThorFee } from "./timeAndFeeComparison/ThorSwapFees";
import { getRelayFee } from "./timeAndFeeComparison/RelayFees";
import { SwapPlatform } from "./timeAndFeeComparison/constants";
import { logger } from "../utils/logger";
import { formatTime, formatTimeDiff } from "./timeAndFeeComparison/utils";

/**
 * Compares Garden's fees and time with other services and calculates the maximum differences
 * @param srcAsset The source asset
 * @param destAsset The destination asset
 * @param amount The transaction amount
 * @param gardenFee The fee charged by Garden
 * @param gardenSwapTime The time taken by Garden swap in string format (e.g., "2m 30s")
 * @returns Object containing the max fees and times from other services and the calculated differences
 */
export async function compareWithOtherServices(
  srcAsset: Asset,
  destAsset: Asset,
  amount: number,
  gardenFee: number,
  gardenSwapTime: string
): Promise<{
  totalTimeOfOthersMax: string;
  totalAmountOthersMax: string;
  timeSaved: string;
  timeSavedMinutes: number;
  feeSaved: number;
}> {
  try {
    // Get fees and times from different services
    const [chainflipMetrics, thorMetrics, relayMetrics] = await Promise.all([
      getChainflipFee(srcAsset, destAsset, amount).catch((error) => {
        logger.error(`Chainflip service error: ${error}`);
        return { fee: 0, time: 0 };
      }),
      getThorFee(srcAsset, destAsset, amount).catch((error) => {
        logger.error(`Thor service error: ${error}`);
        return { fee: 0, time: 0 };
      }),
      getRelayFee(srcAsset, destAsset, amount).catch((error) => {
        logger.error(`Relay service error: ${error}`);
        return { fee: 0, time: 0 };
      }),
    ]);

    // Find the maximum fee and time among all services
    const services = [
      { name: SwapPlatform.CHAINFLIP, ...chainflipMetrics },
      { name: SwapPlatform.THORSWAP, ...thorMetrics },
      { name: SwapPlatform.RELAY, ...relayMetrics },
    ];

    const validServices = services.filter(
      (service) => service.fee > 0 && service.time > 0
    );

    if (validServices.length === 0) {
      logger.warn("No valid comparison services found for this swap");
      return {
        totalTimeOfOthersMax: "0",
        totalAmountOthersMax: "0",
        timeSaved: "0m 0s",
        timeSavedMinutes: 0,
        feeSaved: 0,
      };
    }

    // Find the service with the highest fee
    const maxFeeService = validServices.reduce(
      (max, service) => (service.fee > max.fee ? service : max),
      validServices[0]
    );

    // Find the service with the longest time
    const maxTimeService = validServices.reduce(
      (max, service) => (service.time > max.time ? service : max),
      validServices[0]
    );

    // Calculate time saved (in seconds and formatted)
    const gardenTimeInSeconds = parseTimeString(gardenSwapTime);
    const timeSavedSeconds = maxTimeService.time - gardenTimeInSeconds;
    const timeSavedMinutes = Math.floor(timeSavedSeconds / 60);

    // Calculate fee saved
    const feeSaved = maxFeeService.fee - gardenFee;

    // Format the values for display
    const formattedTimeSaved = formatTimeDiff(timeSavedSeconds);
    const formattedMaxTime = formatTime(maxTimeService.time);
    const formattedMaxFee = maxFeeService.fee.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      totalTimeOfOthersMax: formattedMaxTime,
      totalAmountOthersMax: formattedMaxFee,
      timeSaved: formattedTimeSaved,
      timeSavedMinutes,
      feeSaved,
    };
  } catch (error) {
    logger.error("Error comparing with other services:", error);
    return {
      totalTimeOfOthersMax: "0",
      totalAmountOthersMax: "0",
      timeSaved: "0m 0s",
      timeSavedMinutes: 0,
      feeSaved: 0,
    };
  }
}

/**
 * Parse a time string in the format "Xm Ys" to seconds
 * @param timeString Time string in the format "Xm Ys"
 * @returns Total seconds
 */
function parseTimeString(timeString: string): number {
  if (!timeString) return 0;

  const minutesMatch = timeString.match(/(\d+)m/);
  const secondsMatch = timeString.match(/(\d+)s/);

  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0;

  return minutes * 60 + seconds;
}
