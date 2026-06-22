import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "x402-next";
import Anthropic from "@anthropic-ai/sdk";
import { viemClient } from "@/lib/viemClient";
import { getOnchainQuotes } from "@/lib/onchainQuote";
import { BASE_TOKENS } from "@/constants/tokens";
import { parseUnits } from "viem";
import type { SwapPreview } from "@/types/agent";

const SYSTEM_PROMPT = `Routis AI Agent — Base mainnet DEX aggregator. Uniswap V3, PancakeSwap V3, SushiSwap, Aerodrome.

ÖNEMLİ: Her zaman İngilizce yanıt ver.

Kurallar:
- Swap talebi → get_swap_quote çağır → 1 cümle özet → SWAP_PREVIEW bloğu
- Fiyat sorusu → get_token_price çağır
- Base dışı ağ/finansal tavsiye/swap dışı konu → reddet
- Price impact >%3 → ⚠️ uyarı

Tokenlar: ETH WETH USDC USDT cbBTC DAI AERO BRETT TOSHI DEGEN VIRTUAL cbETH wstETH weETH rETH LINK USDe USDS MORPHO MOG EURC ZORA PENDLE YFI MOG

SWAP_PREVIEW_START
{"fromToken":"SEMBOL","toToken":"SEMBOL","amountIn":"MIKTAR","amountOut":"MIKTAR","bestDex":"DEX","allRoutes":[{"dex":"Uniswap V3","amountOut":"X","fee":"0.05%"}],"fee":"0.05%","priceImpact":"0.05%","slippage":"0.5%"}
SWAP_PREVIEW_END

SWAP_PREVIEW_START ve SWAP_PREVIEW_END arasına SADECE tek satır JSON. Markdown code block kullanma.`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_swap_quote",
    description:
      "Routis aggregator'dan en iyi swap rotasını çeker. Uniswap V3, PancakeSwap V3, SushiSwap ve Aerodrome karşılaştırılır. En yüksek amountOut değerini veren rota seçilir.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromToken: { type: "string", description: "Kaynak token sembolü (ETH, USDC, USDT, cbBTC, DAI vb.)" },
        toToken:   { type: "string", description: "Hedef token sembolü" },
        amountIn:  { type: "string", description: "Gönderilecek miktar, sadece sayı (örn: '10', '0.5')" },
      },
      required: ["fromToken", "toToken", "amountIn"],
    },
  },
  {
    name: "get_token_price",
    description: "Token'ın anlık USD fiyatını döner.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Token sembolü (ETH, USDC, cbBTC vb.)" },
      },
      required: ["symbol"],
    },
  },
];

async function executeGetSwapQuote(fromToken: string, toToken: string, amountIn: string): Promise<object> {
  const tokenIn  = BASE_TOKENS.find((t) => t.symbol.toUpperCase() === fromToken.toUpperCase());
  const tokenOut = BASE_TOKENS.find((t) => t.symbol.toUpperCase() === toToken.toUpperCase());

  if (!tokenIn || !tokenOut) {
    return { error: `Desteklenmeyen token: ${fromToken} veya ${toToken}.` };
  }

  try {
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);
    const quotes = await getOnchainQuotes(viemClient, {
      tokenIn:    tokenIn.address  as `0x${string}`,
      tokenOut:   tokenOut.address as `0x${string}`,
      amountIn:   amountInWei,
      decimalsIn: tokenIn.decimals,
      decimalsOut: tokenOut.decimals,
    });

    if (!quotes.length) return { error: `${fromToken}→${toToken} çifti için rota bulunamadı.` };

    const best = quotes[0];
    return {
      fromToken: tokenIn.symbol,
      toToken:   tokenOut.symbol,
      amountIn,
      amountOut:   best.amountOutFormatted,
      bestDex:     best.dexName,
      priceImpact: best.priceImpact.toFixed(3) + "%",
      fee:         best.fee ? (best.fee / 10000).toFixed(2) + "%" : "0.30%",
      allRoutes:   quotes.map((q) => ({
        dex:       q.dexName,
        amountOut: q.amountOutFormatted,
        fee:       q.fee ? (q.fee / 10000).toFixed(2) + "%" : "0.30%",
      })),
    };
  } catch (err) {
    console.error("[get_swap_quote error]", err);
    return { error: "Quote alınırken hata oluştu." };
  }
}

async function executeGetTokenPrice(symbol: string): Promise<object> {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) return { symbol, price: "unavailable" };
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?symbols=${symbol.toUpperCase()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { symbol, price: "unavailable" };
    const json = await res.json();
    const price = json?.data?.[0]?.prices?.[0]?.value;
    return { symbol: symbol.toUpperCase(), price: price ? `$${parseFloat(price).toFixed(2)}` : "unavailable" };
  } catch {
    return { symbol, price: "unavailable" };
  }
}

function parseSwapPreview(text: string): SwapPreview | undefined {
  try {
    const start = text.indexOf("SWAP_PREVIEW_START");
    const end   = text.indexOf("SWAP_PREVIEW_END");
    if (start === -1 || end === -1) return undefined;
    let json = text.slice(start + "SWAP_PREVIEW_START".length, end).trim();
    json = json.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try { return JSON.parse(json) as SwapPreview; }
    catch {
      const f = json.indexOf("{"); const l = json.lastIndexOf("}");
      if (f !== -1 && l !== -1) return JSON.parse(json.slice(f, l + 1)) as SwapPreview;
    }
    return undefined;
  } catch { return undefined; }
}

function stripPreviewBlock(text: string): string {
  const start = text.indexOf("SWAP_PREVIEW_START");
  const end   = text.indexOf("SWAP_PREVIEW_END");
  if (start === -1 || end === -1) return text;
  const before = text.slice(0, start).trim();
  const after  = text.slice(end + "SWAP_PREVIEW_END".length).trim();
  return [before, after].filter(Boolean).join("\n\n").trim();
}

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────
// SECURITY: prevent API key abuse — max 20 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT   = 20;
const RATE_WINDOW  = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now    = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// ── Core handler ─────────────────────────────────────────────────────────────
async function agentHandler(req: NextRequest): Promise<NextResponse> {
  // SECURITY: rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const { messages, userAddress } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const client  = new Anthropic({ apiKey });
  const history: Anthropic.MessageParam[] = messages
    .slice(-6)
    .map((m: { role: string; content: string }) => ({
      // SECURITY: force role to "user" or "assistant" only — prevent role injection
      role:    (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      // SECURITY: truncate content to 2000 chars to prevent prompt injection
      content: String(m.content ?? "").slice(0, 2000),
    }));

  let iterationCount = 0;
  const MAX_ITERATIONS = 3;

  try {
    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;

      const response = await client.messages.create({
        model:      "claude-haiku-4-5",
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        tools,
        messages:   history,
      });

      if (response.stop_reason === "end_turn") {
        const textContent = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        console.log("[agent] raw textContent:", textContent.slice(0, 500));

        const swapPreview = parseSwapPreview(textContent);
        console.log("[agent] parsed swapPreview:", swapPreview ? "OK" : "FAILED");

        const cleanText = swapPreview ? stripPreviewBlock(textContent) : textContent;
        return NextResponse.json({ content: cleanText, swapPreview });
      }

      if (response.stop_reason === "tool_use") {
        history.push({ role: "assistant", content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          let result: object;
          if (block.name === "get_swap_quote") {
            const input = block.input as { fromToken: string; toToken: string; amountIn: string };
            result = await executeGetSwapQuote(input.fromToken, input.toToken, input.amountIn);
          } else if (block.name === "get_token_price") {
            const input = block.input as { symbol: string };
            result = await executeGetTokenPrice(input.symbol);
          } else {
            result = { error: `Unknown tool: ${block.name}` };
          }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }

        history.push({ role: "user", content: toolResults });
        continue;
      }
      break;
    }

    return NextResponse.json({ content: "An error occurred. Please try again." });
  } catch (err) {
    console.error("[agent API error]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Export ───────────────────────────────────────────────────────────────────
export const POST = agentHandler;
