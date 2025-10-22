import express from "express";
import "dotenv/config";
import axios from "axios";
// Optional: allow your Vue app to call this API from the browser
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // uncomment if calling from the browser

const CMC = axios.create({
  baseURL: "https://pro-api.coinmarketcap.com",
  headers: { "X-CMC_PRO_API_KEY": process.env.CMC_KEY },
});

// Health & echo (your existing routes)
app.get("/", (req, res) => res.send("Hello Express 👋"));
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.post("/echo", (req, res) => res.json({ youSent: req.body }));

// 1) Latest listings: top coins
app.get("/crypto", async (req, res) => {
  console.log("API Received");
  try {
    const { limit = 10, convert = "USD", start = 1 } = req.query;
    const { data } = await CMC.get("/v1/cryptocurrency/listings/latest", {
      params: { start, limit, convert },
    });
    console.log(data, "API Received");
    res.send(data); // full payload
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// 2) Single coin live price by symbol, e.g. /price?symbol=BTC
app.get("/price", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "").toUpperCase();
    const convert = (req.query.convert || "USD").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    // quotes/latest is better for a specific coin
    const { data } = await CMC.get("/v2/cryptocurrency/quotes/latest", {
      params: { symbol, convert },
    });

    const coin = data.data?.[symbol]?.[0];
    if (!coin) return res.status(404).json({ error: "symbol not found" });

    const price = coin.quote?.[convert]?.price;
    res.json({
      symbol,
      name: coin.name,
      convert,
      price,
      last_updated: coin.quote?.[convert]?.last_updated,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running → http://localhost:${PORT}`)
);
