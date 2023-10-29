import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import * as fflate from "fflate";

import {
  generateDeepLink,
  accountSearch,
  getBlockedAccounts,
  getFullAccounts,
  fetchOrderBook,
  fetchLimitOrders,
  getAccountBalances,
  getLimitOrders,
  getAccountHistory,
  getPortfolio,
  getObjects,
  getMarketTrades,
  fetchMarkets,
  fetchCreditDeals,
} from "./lib/api";

import {
  getFeeSchedule,
  getAsset,
  getPool,
  getDynamicData,
  getMarketSearch,
  getAllAssets,
  getPools,
  getActiveOffers,
  getMinBitassets,
} from "./lib/cache";

import { validResult } from "./lib/common";

import { swaggerConfig } from "./config/swagger";
import { chains } from "./config/chains";

const app = new Elysia()
  .use(staticPlugin({ prefix: "/" }))
  .use(swagger(swaggerConfig))
  .use(
    staticPlugin({
      prefix: "/bitshares",
      assets: "./src/data/bitshares",
    })
  )
  .use(
    staticPlugin({
      prefix: "/bitshares_testnet",
      assets: "./src/data/bitshares_testnet",
    })
  )
  .state("bitshares_nodes", JSON.stringify(chains.bitshares.nodeList))
  .state(
    "bitshares_testnet_nodes",
    JSON.stringify(chains.bitshares_testnet.nodeList)
  )
  .onError(({ code, error }) => {
    return new Response(error.toString());
  })
  .use(
    cors({
      origin: /localhost/,
    })
  )
  .get(
    "/",
    () => {
      // Index page which uses staticPlugin resources
      return Bun.file("./public/index.html");
    },
    {
      detail: {
        summary:
          'Bitshares Pool tool demo web interface. Visit "http://localhost:8080/" in a web browser.',
        tags: ["Website"],
      },
    }
  )
  .group("/state", (app) =>
    app.get(
      "/currentNodes/:chain",
      ({
        store: { bitshares_nodes, bitshares_testnet_nodes },
        params: { chain },
      }) => {
        if (
          !chain ||
          (chain && chain !== "bitshares" && chain !== "bitshares_testnet")
        ) {
          throw new Error("Invalid chain");
        }

        return JSON.parse(
          chain === "bitshares" ? bitshares_nodes : bitshares_testnet_nodes
        );
      },
      {
        detail: {
          summary: "Output the current order of blockchain nodes",
          tags: ["State"],
        },
      }
    )
  )
  .group("/api", (app) =>
    app
      .post(
        "/deeplink/:chain/:opType",
        async ({ body, params: { chain, opType } }) => {
          // Generate a Beet deeplink for all chain operation types
          if (!body || !JSON.parse(body) || !chain || !opType) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          let generatedDeepLink;
          try {
            generatedDeepLink = await generateDeepLink(
              chain,
              opType,
              JSON.parse(body),
              app
            );
          } catch (error) {
            throw error;
          }

          return validResult({ generatedDeepLink });
        },
        {
          body: t.String({
            description: "The JSON-encoded request body",
            example: [
              [
                {
                  account: "1.2.1811495",
                  pool: "1.19.0",
                  amount_to_sell: {
                    amount: 100000,
                    asset_id: "1.3.0",
                  },
                  min_to_receive: {
                    amount: 635,
                    asset_id: "1.3.3291",
                  },
                  extensions: [],
                },
              ],
            ],
          }),
          detail: {
            summary: "Generate a deep link",
            tags: ["Beet"],
          },
        }
      )
      .get(
        "/blockedAccounts/:chain",
        ({ params: { chain } }) => {
          // Return a list of blocked accounts
          if (chain !== "bitshares") {
            throw new Error("Invalid chain");
          }
          return getBlockedAccounts(chain, app);
        },
        {
          detail: {
            summary: "Get a list of blocked accounts",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/fullAccount/:chain/:id",
        async ({ params: { chain, id } }) => {
          // Return full accounts
          if (!chain || !id) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return getFullAccounts(chain, id, app);
        },
        {
          detail: {
            summary: "Get a single account's full details",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/orderBook/:chain/:quote/:base",
        async ({ params: { chain, quote, base } }) => {
          if (!chain || !base || !quote) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return fetchOrderBook(chain, quote, base, app);
        },
        {
          detail: {
            summary: "Get trading pair market orders",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/limitOrders/:chain/:base/:quote",
        async ({ params: { chain, base, quote } }) => {
          if (!chain || !base || !quote) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return fetchLimitOrders(chain, base, quote, app);
        },
        {
          detail: {
            summary: "Get trading pair limit orders",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/accountLookup/:chain/:searchInput",
        async ({ params: { chain, searchInput } }) => {
          // Search for user input account
          if (!chain || !searchInput) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return accountSearch(chain, searchInput, app);
        },
        {
          detail: {
            summary: "Search for blockchain account",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getAccountBalances/:chain/:id",
        async ({ params: { chain, id } }) => {
          // Return account balances
          if (!chain || !id) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return getAccountBalances(chain, id, app);
        },
        {
          detail: {
            summary: "Get an account's balance",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getAccountLimitOrders/:chain/:id",
        async ({ params: { chain, id } }) => {
          // Return account limit orders
          if (!chain || !id) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return getLimitOrders(chain, id, 100, app);
        },
        {
          detail: {
            summary: "Get an account's limit orders",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getAccountHistory/:chain/:id",
        async ({ params: { chain, id } }) => {
          // Return account history
          if (!chain || !id) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return getAccountHistory(chain, id);
        },
        {
          detail: {
            summary: "Get an account's history",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getPortfolio/:chain/:id",
        async ({ params: { chain, id } }) => {
          // Return portfolio data
          if (!chain || !id) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return getPortfolio(chain, id, app);
        },
        {
          detail: {
            summary:
              "Retrieve an account's open orders, balances and recent history in a single query.",
            tags: ["Blockchain"],
          },
        }
      )
      .post(
        "/getObjects/:chain",
        async ({ body, params: { chain } }) => {
          // Fetch multiple objects from the blockchain
          if (!body || !chain) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          const objects = JSON.parse(body);

          let retrievedObjects;
          try {
            retrievedObjects = await getObjects(chain, objects, app);
          } catch (error) {
            throw error;
          }

          if (!retrievedObjects) {
            throw new Error("Objects not found");
          }

          return validResult(retrievedObjects);
        },
        {
          detail: {
            summary: "Get objects",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getMarketHistory/:chain/:quote/:base/:accountID",
        async ({ params: { chain, quote, base, accountID } }) => {
          // Fetch market history
          if (!chain || !base || !quote || !accountID) {
            throw new Error("Missing required fields");
          }

          if (!base.includes("1.3.") || !quote.includes("1.3.")) {
            throw new Error("Invalid asset IDs");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return await getMarketTrades(chain, quote, base, accountID, app);
        },
        {
          detail: {
            summary: "Get market history",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/getFeaturedMarkets/:chain",
        async ({ params: { chain } }) => {
          // Fetch market history
          if (!chain) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          return await fetchMarkets(chain);
        },
        {
          detail: {
            summary: "Get featured markets",
            tags: ["Blockchain"],
          },
        }
      )
      .get(
        "/fetchCreditDeals/:chain/:account",
        async ({ params: { chain, account } }) => {
          // Fetch credit deals
          if (!chain || !account) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          let creditDeals;
          try {
            creditDeals = await fetchCreditDeals(chain, account, app);
          } catch (error) {
            console.log({ error });
            throw error;
          }

          return creditDeals;
        },
        {
          detail: {
            summary: "Get an user's credit deals",
            tags: ["Blockchain"],
          },
        }
      )
  )
  .group("/cache", (app) =>
    app
      .get("/allassets/:chain", async ({ params: { chain } }) => {
        if (chain !== "bitshares" && chain !== "bitshares_testnet") {
          throw new Error("Invalid chain");
        }
        return getAllAssets(chain);
      })
      .get(
        "/offers/:chain",
        async ({ params: { chain } }) => {
          // Return all offers
          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }
          return getActiveOffers(chain);
        },
        {
          detail: {
            summary: "A list of Bitshares offers",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/pools/:chain",
        async ({ params: { chain } }) => {
          // Return entire pool json file
          return getPools(chain);
        },
        {
          detail: {
            summary: "A list of Bitshares pools",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/bitassets/:chain",
        async ({ params: { chain } }) => {
          // Return the min bitasset data for this chain
          return getMinBitassets(chain);
        },
        {
          detail: {
            summary: "A list of Bitshares bitassets",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/pool/:chain/:id",
        ({ params: { chain, id } }) => {
          // Return a pool's extended JSON data
          if (
            !chain ||
            (chain !== "bitshares" && chain !== "bitshares_testnet") ||
            !id
          ) {
            throw new Error("Missing required fields");
          }
          return getPool(chain, id);
        },
        {
          detail: {
            summary: "Retrieve a Bitshares pool",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/dynamic/:chain/:id",
        ({ params: { chain, id } }) => {
          // Return a pool's extended JSON data
          if (
            !chain ||
            (chain !== "bitshares" && chain !== "bitshares_testnet") ||
            !id
          ) {
            throw new Error("Missing required fields");
          }
          return getDynamicData(chain, id);
        },
        {
          detail: {
            summary: "Retrieve an asset's dynamic data",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/asset/:chain/:id",
        ({ params: { chain, id } }) => {
          // Return a single asset's JSON data
          if (
            !chain ||
            (chain !== "bitshares" && chain !== "bitshares_testnet") ||
            !id
          ) {
            throw new Error("Missing required fields");
          }
          const retrievedAsset = getAsset(chain, id);
          if (retrievedAsset) {
            return validResult(retrievedAsset);
          } else {
            throw new Error("Asset not found");
          }
        },
        {
          detail: {
            summary: "Retreive a Bitshares asset",
            tags: ["Cache"],
          },
        }
      )
      .post(
        "/assets/:chain",
        async ({ body, params: { chain } }) => {
          if (!body || Object.keys(body).length === 0 || !chain) {
            throw new Error("Missing required fields");
          }

          if (chain !== "bitshares" && chain !== "bitshares_testnet") {
            throw new Error("Invalid chain");
          }

          const assetIDs =
            typeof body === "object" ? Object.values(body) : JSON.parse(body);
          const assets = [];
          for (let i = 0; i < assetIDs.length; i++) {
            const asset = getAsset(chain, assetIDs[i]);
            if (asset) {
              assets.push(asset);
            }
          }

          return validResult(assets);
        },
        {
          detail: {
            summary: "Retrieve multiple Bitshares assets",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/feeSchedule/:chain",
        async ({ params: { chain } }) => {
          if (
            !chain ||
            (chain !== "bitshares" && chain !== "bitshares_testnet")
          ) {
            throw new Error("Missing required fields");
          }

          return getFeeSchedule(chain);
        },
        {
          detail: {
            summary: "Data for fee schedule",
            tags: ["Cache"],
          },
        }
      )
      .get(
        "/marketSearch/:chain",
        async ({ params: { chain } }) => {
          if (
            !chain ||
            (chain !== "bitshares" && chain !== "bitshares_testnet")
          ) {
            throw new Error("Missing required fields");
          }

          return getMarketSearch(chain);
        },
        {
          detail: {
            summary: "Data for market asset search",
            tags: ["Cache"],
          },
        }
      )
  )
  .listen(8080);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} `
);
