import { getAssetInfo } from "../services/api";
import { convertToSuccessfulOrder } from "../services/metrics";
import { logger } from "../utils/logger";

async function test_something() {
  const networkInfo = await getAssetInfo(
    "https://api.garden.finance/info/assets/mainnet"
  );

  const successfulOrder = await convertToSuccessfulOrder(
    {
      created_at: "2025-05-19T09:08:09.810539Z",
      updated_at: "2025-05-19T09:08:09.810539Z",
      deleted_at: null,
      source_swap: {
        created_at: "2025-05-19T09:08:09.808928Z",
        updated_at: "2025-05-19T09:31:59.021264Z",
        deleted_at: null,
        swap_id:
          "bc1p9nxawu7gly7j8fhgzt92laxrs3d5auv0a9l9esrnexrwjgacy2tq9s4dlr",
        chain: "bitcoin",
        asset: "primary",
        initiator:
          "242572ef91d7d6b10c48dadaff380db1c3760b8ff935c77bf0e347b019db35c6",
        redeemer:
          "aa86614fda03b039bf077e7be6531159c3b157166259168908097b9983156919",
        timelock: 144,
        filled_amount: "12000",
        amount: "12000",
        secret_hash:
          "2b1140d7ceb50bb9ca19de23e598cbc39fbb0ae1d6651ed10e37dc9b68f7f669",
        secret:
          "7c46081fe9320eb275e2b3050012fbcddc0e80e933847dc6b63d1a54a0f1cb9d",
        initiate_tx_hash:
          "cc86031ed888ec1c65f7d958733130cf27fc1c85104d0f408eed848759aa3add:897392",
        redeem_tx_hash:
          "a201695aa7e2b4abe7454c76199ebb5c25521fb9c2caf9f061e54a06d3031745",
        refund_tx_hash: "",
        initiate_block_number: "897392",
        redeem_block_number: "897394",
        refund_block_number: "0",
        required_confirmations: 1,
      },
      destination_swap: {
        created_at: "2025-05-19T09:08:09.808928Z",
        updated_at: "2025-05-19T09:30:48.795718Z",
        deleted_at: null,
        swap_id:
          "359c4306008ba82e4548566c6442d8f0c0cca31a6c159b3f7869a037e6bf02ec",
        chain: "ethereum",
        asset: "0x795dcb58d1cd4789169d5f938ea05e17eceb68ca",
        initiator: "0x3fDEe07b0756651152BF11c8D170D72d7eBbEc49",
        redeemer: "0x62217B071db44Dabbd386577200079C8fbc92088",
        timelock: 600,
        filled_amount: "11964",
        amount: "11964",
        secret_hash:
          "2b1140d7ceb50bb9ca19de23e598cbc39fbb0ae1d6651ed10e37dc9b68f7f669",
        secret:
          "7c46081fe9320eb275e2b3050012fbcddc0e80e933847dc6b63d1a54a0f1cb9d",
        initiate_tx_hash:
          "0x16a03e451c145b97a8fa6e0761fa6d6f1636e5e7ce64c678f23c87670289ae80",
        redeem_tx_hash:
          "0xeeb4232cb643d8c805982ec920a14cb0db39f38928ac462532f1c89a3e7d03ec",
        refund_tx_hash: "",
        initiate_block_number: "22516091",
        redeem_block_number: "22516132",
        refund_block_number: "0",
        required_confirmations: 0,
      },
      create_order: {
        created_at: "2025-05-19T09:08:09.810539Z",
        updated_at: "2025-05-19T09:08:09.810539Z",
        deleted_at: null,
        create_id:
          "bd4d1c864119c7bad2dde31b0b64e4bef77e9a68a1e16433f9c845dc53e7d9af",
        block_number: "22516017",
        source_chain: "bitcoin",
        destination_chain: "ethereum",
        source_asset: "primary",
        destination_asset: "0x795dcb58d1cd4789169d5f938ea05e17eceb68ca",
        initiator_source_address:
          "242572ef91d7d6b10c48dadaff380db1c3760b8ff935c77bf0e347b019db35c6",
        initiator_destination_address:
          "0x62217B071db44Dabbd386577200079C8fbc92088",
        source_amount: "12000",
        destination_amount: "11964",
        fee: "0.037181503623079111172000",
        nonce: "1747645685514",
        min_destination_confirmations: 0,
        timelock: 144,
        secret_hash:
          "2b1140d7ceb50bb9ca19de23e598cbc39fbb0ae1d6651ed10e37dc9b68f7f669",
        additional_data: {
          strategy_id: "bnyremac",
          bitcoin_optional_recipient:
            "bc1pds6jt2apcle9cvus40m4vkzperwgh74jhwyhkxkm8xr4n8mruwgsqetqhj",
          input_token_price: 103281.95450855308,
          output_token_price: 103281.95450855308,
          sig: "33d96e5332a507f6cc5069a11471a61788aa5ba5a77dc118caaca04197e3628c68ea27ed13a83f73a9008ebef0b9c810ac5dce829e3bcd6a8aec4d554194ea661c",
          deadline: 1747649284,
          instant_refund_tx_bytes:
            "02000000000101dd3aaa598784ed8e400f4d10851cfc27cf30317358d9f7651cec88d81e0386cc0000000000ffffffff01a82c0000000000002251206c3525aba1c7f25c3390abf7565841c8dc8bfab2bb897b1adb3987599f63e3910441d811d23132f93445437e977aaadda1f480c589c7dd59e85bbe4bcd0144610bc6e77879bc68225b5fc648579a4fe15d095e7164ba5341fb7fde7efabc8a021b698341d811d23132f93445437e977aaadda1f480c589c7dd59e85bbe4bcd0144610bc6e77879bc68225b5fc648579a4fe15d095e7164ba5341fb7fde7efabc8a021b69834620242572ef91d7d6b10c48dadaff380db1c3760b8ff935c77bf0e347b019db35c6ac20aa86614fda03b039bf077e7be6531159c3b157166259168908097b9983156919ba529c61c12160e11a135f94e536a5b222e5d09fd9db1be5f5f5e753920290c0410cf388f07171c83574a0f5ed5b0fe7988434e881a04a7b5e1b3ca5964d6fb26e876cb402736b1be6e352ad9063d172be0add375e0e3e0e5e1f54b17cce53dca3df22ada100000000",
          tx_hash:
            "0x85071aa8cbbb5a473a0237f1d2a2ecf4e51dbbc6e6aa1df0d22a6d790db52f08",
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
