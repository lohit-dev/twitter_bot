import { logger } from "./logger";
// ======================================================================
// MAIN FORMATTING FUNCTIONS
// ======================================================================

/**
 * Formats a number with thousands separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Formats a number as currency with appropriate suffix (B, M, K)
 * based on the magnitude of the value
 */
export function formatCurrency(num: number): string {
  const value = Math.abs(num);

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a decimal as a percentage with 1 decimal place
 */
export function formatPercentage(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num);
}

// ======================================================================
// BLOCKCHAIN AND TIME FORMATTERS
// ======================================================================

/**
 * Converts chain identifier to a user-friendly display name
 */
export function formatChainName(chain: string): string {
  const chainMap: { [key: string]: string } = {
    arbitrum_sepolia: "Arbitrum",
    starknet_sepolia: "StarkNet",
    bitcoin_testnet: "Bitcoin",
    ethereum: "Ethereum",
    polygon: "Polygon",
    optimism: "Optimism",
    base: "Base",
  };

  return chainMap[chain.toLowerCase()] || chain;
}
