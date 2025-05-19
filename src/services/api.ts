import axios from "axios";
import { MatchedOrder } from "@gardenfi/orderbook";
import { logger } from "../utils/logger";

export interface AssetConfig {
  name: string;
  decimals: number;
  symbol: string;
  logo: string;
  tokenAddress: string;
  atomicSwapAddress: string;
  min_amount: string;
  max_amount: string;
}

export interface NetworkInfo {
  chainId: string;
  networkLogo: string;
  explorer: string;
  networkType: string;
  name: string;
  assetConfig: AssetConfig[];
  identifier: string;
}

export type HashiraNetworkResponse = Record<string, NetworkInfo>;

export async function getAssetInfo(
  url: string
): Promise<HashiraNetworkResponse> {
  try {
    logger.info("Fetching network and asset information from Hashira API");
    const response = await axios.get<HashiraNetworkResponse>(url);

    const networks = Object.keys(response.data);
    logger.info(
      `Successfully received information for ${networks.length} networks: ${networks.join(", ")}`
    );

    // Log asset information for each network
    for (const [network, info] of Object.entries(response.data)) {
      logger.info(
        `Network ${network} has ${info.assetConfig.length} assets configured`
      );
      info.assetConfig.forEach((asset) => {
        logger.debug(
          `Asset on ${network}: ${asset.symbol} (${asset.name}) with ${asset.decimals} decimals`
        );
      });
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(`Hashira API request failed: ${error.message}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    } else {
      logger.error("Unexpected error while fetching asset information:", error);
    }
    throw error;
  }
}

// Define the paginated response structure
export interface PaginatedMatchedOrderResponse {
  data: MatchedOrder[];
  page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
}

export async function getMatchedOrder(
  per_page: number,
  page: number = 1
): Promise<PaginatedMatchedOrderResponse> {
  try {
    logger.info("Fetching matched order");
    const res = await axios.get(
      `https://xcgg04skw4k044ws8swok4gw.65.109.18.60.sslip.io/matched?page=${page}&per_page=${per_page}`
    );

    return res.data as PaginatedMatchedOrderResponse;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.error(`Hashira API request failed: ${err.message}`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      });
    }

    throw err;
  }
}
