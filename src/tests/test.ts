import { getAssetInfo } from "../services/api";
import { convertToSuccessfulOrder } from "../services/metrics";
import { logger } from "../utils/logger";

async function test_something() {
  const networkInfo = await getAssetInfo(
    "https://api.garden.finance/info/assets/mainnet"
  );

  const successfulOrder = await convertToSuccessfulOrder(
    {
      created_at: "2025-05-19T11:51:48.415832Z",
      updated_at: "2025-05-19T11:51:48.415832Z",
      deleted_at: null,
      source_swap: {
        created_at: "2025-05-19T11:51:48.414050Z",
        updated_at: "2025-05-19T11:52:44.523009Z",
        deleted_at: null,
        swap_id:
          "8876351c14e2f1b1184b41ccf80aae2c09cd83734e4c6d0544b28716d93dd097",
        chain: "arbitrum",
        asset: "0xeae7721d779276eb0f5837e2fe260118724a2ba4",
        initiator: "0xC05AA471f3bF88c940812d17A7630F620f003778",
        redeemer: "0x3fDEe07b0756651152BF11c8D170D72d7eBbEc49",
        timelock: 7200,
        filled_amount: "250000000",
        amount: "250000000",
        secret_hash:
          "4a7c015d70ed4288534490312c4c76c56d090ef084e0f2464acd1a9fe066e35d",
        secret:
          "943888973b1a8048cec04d6d9cd2051616842eb84901cc8e6fa0a5edf4daedb4",
        initiate_tx_hash:
          "0xe0141e59011a5c9ce55b579da18cfeb5ca652a6220ab0e18fe22afd31b7477ac",
        redeem_tx_hash:
          "0x1a2e6d0af468be750af8910f3fd1c4fd42e830b5b88c6eeb9ae69ff11e43db61",
        refund_tx_hash: "",
        initiate_block_number: "22516825",
        redeem_block_number: "22516828",
        refund_block_number: "0",
        required_confirmations: 1,
      },
      destination_swap: {
        created_at: "2025-05-19T11:51:48.414050Z",
        updated_at: "2025-05-19T11:53:38.906704Z",
        deleted_at: null,
        swap_id:
          "bc1phm8c8pygqg920c28e2qf93x36a92zmj92hna0v5t2xalq64n7tns76jg0l",
        chain: "bitcoin",
        asset: "primary",
        initiator:
          "aa86614fda03b039bf077e7be6531159c3b157166259168908097b9983156919",
        redeemer:
          "949be5ab2929ab9591192995273f467dc27dd9158bd404ce59fd2482c9968f85",
        timelock: 12,
        filled_amount: "241841",
        amount: "241841",
        secret_hash:
          "4a7c015d70ed4288534490312c4c76c56d090ef084e0f2464acd1a9fe066e35d",
        secret:
          "943888973b1a8048cec04d6d9cd2051616842eb84901cc8e6fa0a5edf4daedb4",
        initiate_tx_hash:
          "f8d0b96bdcf6d9556cd21398ece689176aa7b39f7ab033da5b24dd47bd7226ef:897407",
        redeem_tx_hash:
          "c7e84657a9e0fc92f6f560768103da923312bf622f8cd36592bd4bc82c8e709d",
        refund_tx_hash: "",
        initiate_block_number: "897407",
        redeem_block_number: "897407",
        refund_block_number: "0",
        required_confirmations: 0,
      },
      create_order: {
        created_at: "2025-05-19T11:51:48.415832Z",
        updated_at: "2025-05-19T11:51:48.415832Z",
        deleted_at: null,
        create_id:
          "0c40faeefe7efaa50c9ce41e2107abf9c9b03792fd716755875dbfbc0f721a82",
        block_number: "22516824",
        source_chain: "arbitrum",
        destination_chain: "bitcoin",
        source_asset: "0xeae7721d779276eb0f5837e2fe260118724a2ba4",
        destination_asset: "primary",
        initiator_source_address: "0xC05AA471f3bF88c940812d17A7630F620f003778",
        initiator_destination_address:
          "949be5ab2929ab9591192995273f467dc27dd9158bd404ce59fd2482c9968f85",
        source_amount: "250000000",
        destination_amount: "241841",
        fee: "0.75005227475322432120",
        nonce: "1747655502497",
        min_destination_confirmations: 0,
        timelock: 7200,
        secret_hash:
          "4a7c015d70ed4288534490312c4c76c56d090ef084e0f2464acd1a9fe066e35d",
        additional_data: {
          strategy_id: "am4abnyr",
          bitcoin_optional_recipient:
            "bc1qz3e0tj2jz5xc9al2agyxzjfd8x3afyqgxwe4ya",
          input_token_price: 0.9997546527871568,
          output_token_price: 103038.199032437,
          sig: "6b32ddfd8caa2852885936ffea51b0a3a03bbe98a9eb54834748b3df14dbfc8e09127f210ce2647892c93685fe95b71d0f801f34be20fd1c91b58bedceb428a41c",
          deadline: 1747659103,
          tx_hash:
            "0x8faa9220610ba998f3c0801194a63130e126fd7344d6ee54fbe2d85cf7e6a2ed",
          is_blacklisted: false,
        },
      },
    },
    networkInfo
  );

  // Wait a moment for the comparison results to be updated
  await new Promise((resolve) => setTimeout(resolve, 2000));

  logger.info("The order with comparison results: ", successfulOrder);
}

// Execute the test
test_something().catch((error) => {
  logger.error("Test failed:", error);
});
