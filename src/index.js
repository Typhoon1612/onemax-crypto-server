import express from "express";
import "dotenv/config";
import axios from "axios";
// Optional: allow your Vue app to call this API from the browser
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// allow your prod frontend later (replace with your real domain)
const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

// Cors middleware
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// a simple route so Render can test the app
app.get("/health", (_req, res) => res.json({ ok: true }));

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
  try {
    const { limit = 10, convert = "USD", start = 1 } = req.query;
    const { data } = await CMC.get("/v1/cryptocurrency/listings/latest", {
      params: { start, limit, convert },
    });
    res.json(data); // full payload
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// 2) Single coin live price by symbol, e.g. /price?symbol=BTC
app.get("/price", async (req, res) => {
  try {
    // Get symbol and convert currency from URL parameters
    const symbol = (req.query.symbol || "").toUpperCase();
    const convert = (req.query.convert || "USD").toUpperCase();

    // Check if symbol is provided, return error if not
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    // Call CoinMarketCap API to get price data
    const { data } = await CMC.get("/v2/cryptocurrency/quotes/latest", {
      params: { symbol, convert },
    });

    // Extract the coin data from API response
    const coin = data.data?.[symbol]?.[0];

    // Check if coin exists, return error if not found
    if (!coin) return res.status(404).json({ error: "symbol not found" });

    // Get the price from the coin data
    const price = coin.quote?.[convert]?.price;

    // Send back the formatted response
    res.json({
      symbol,
      name: coin.name,
      convert,
      price,
      last_updated: coin.quote?.[convert]?.last_updated,
      percent_change_1h: coin.quote?.[convert]?.percent_change_1h,
    });
  } catch (err) {
    // Handle any errors that occur
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running → http://localhost:${PORT}`)
);