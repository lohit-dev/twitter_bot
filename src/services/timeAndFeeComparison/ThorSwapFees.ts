import { ThorSwapAsset, ThorSwapResponse, ThorSwapRoute } from "./constants";
import { Asset } from "@gardenfi/orderbook";
import { comparisonMetric } from "./constants";
import { API_URLS, SwapPlatform } from "./constants";
import { getFormattedAsset } from "./utils";
import axios from "axios";
import BigNumber from "bignumber.js";
import { logger } from "../../utils/logger";

export const getThorFee = async (
  srcAsset: Asset,
  destAsset: Asset,
  amount: number
): Promise<comparisonMetric> => {
  const sellFormat = getFormattedAsset(srcAsset, SwapPlatform.THORSWAP);
  const buyFormat = getFormattedAsset(destAsset, SwapPlatform.THORSWAP);

  if (!sellFormat || !buyFormat) {
    logger.warn(
      `Thor Swap: Asset mapping not found for ${srcAsset.chain}:${srcAsset.symbol} -> ${destAsset.chain}:${destAsset.symbol}`
    );
    return { fee: 0, time: 0 };
  }

  try {
    const { data: result } = await axios.post<ThorSwapResponse>(
      API_URLS.thorSwap,
      {
        sellAsset: sellFormat,
        buyAsset: buyFormat,
        sellAmount: amount.toString(),
        sourceAddress: "",
        destinationAddress: "",
        affiliate: "t",
        affiliateFee: 50,
        slippage: 3,
        includeTx: true,
        cfBoost: false,
        provider: "THORCHAIN",
      },
      {
        timeout: 10000,
        headers: {
          "X-Api-Key": "3974e4d9-f662-4e6e-a5b6-d44881902dcb",
          "X-Version": "2",
          "Content-Type": "application/json",
        },
      }
    );

    logger.info(`The thor swap response: ${JSON.stringify(result)}`);

    const bestProvider = result.routes.reduce(
      (best: ThorSwapRoute, current: ThorSwapRoute) => {
        const bestAmount = parseFloat(best.expectedBuyAmount);
        const currentAmount = parseFloat(current.expectedBuyAmount);
        return currentAmount > bestAmount ? current : best;
      },
      result.routes[0]
    );

    const inputAssetsFormatted = getFormattedAsset(
      srcAsset,
      SwapPlatform.THORSWAP
    );
    const outputAssetsFormatted = getFormattedAsset(
      destAsset,
      SwapPlatform.THORSWAP
    );

    const inputTokenMeta = bestProvider.meta.assets.find(
      (asset: ThorSwapAsset) => asset.asset === inputAssetsFormatted
    );
    const outputTokenMeta = bestProvider.meta.assets.find(
      (asset: ThorSwapAsset) => asset.asset === outputAssetsFormatted
    );

    const inputValue = new BigNumber(amount)
      .multipliedBy(inputTokenMeta?.price ?? 0)
      .toNumber();

    const outputValue = new BigNumber(bestProvider.expectedBuyAmount)
      .multipliedBy(outputTokenMeta?.price ?? 0)
      .toNumber();

    const fee = inputValue - outputValue;
    const swapDuration = bestProvider.estimatedTime.total;

    return {
      fee,
      time: swapDuration,
    };
  } catch {
    return { fee: 0, time: 0 };
  }
};
