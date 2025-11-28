export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

type Scenario = {
  label: string;
  description: string;
  changePct: number; // in %
  pricePerGram24kInr: number;
  pricePerGramKaratInr?: number;
  totalInr?: number;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const gramsParam = url.searchParams.get("grams");
    const karatParam = url.searchParams.get("karat");
    const daysAheadParam = url.searchParams.get("daysAhead");
    const currentPrice24kParam = url.searchParams.get("currentPrice24k");

    const grams = gramsParam ? parseFloat(gramsParam) : NaN;
    const karat = karatParam ? parseFloat(karatParam) : 24;
    let daysAhead = daysAheadParam ? parseInt(daysAheadParam, 10) : 30;
    const currentPricePerGram24kInr = currentPrice24kParam
      ? parseFloat(currentPrice24kParam)
      : NaN;

    if (Number.isNaN(currentPricePerGram24kInr) || currentPricePerGram24kInr <= 0) {
      return new Response(JSON.stringify({
          success: false,
          message: "Current 24K price per gram is missing. Please calculate today's value first.",
        }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (Number.isNaN(daysAhead) || daysAhead <= 0) {
      daysAhead = 30;
    }

    // we don't really need more than 180 days in this simple model
    if (daysAhead > 180) {
      daysAhead = 180;
    }

    // -----------------------------
    // 1) Define simple % changes
    // -----------------------------
    const basePercent = (daysAhead / 30) * 10; // about ±10% for 30 days
    const maxPercent = 25; // do not exceed ±25%
    const band = Math.min(basePercent, maxPercent);

    const scenariosRaw = [
      {
        label: "Cautious",
        description: "Price eases down slightly",
        changePct: -band,
      },
      {
        label: "Stable",
        description: "Price holds steady",
        changePct: 0,
      },
      {
        label: "Optimistic",
        description: "Price trends upward",
        changePct: band,
      },
    ];

    const purityFactor = karat / 24;

    const scenarios: Scenario[] = scenariosRaw.map((s) => {
      const factor = 1 + s.changePct / 100;
      const pricePerGram24kInr = currentPricePerGram24kInr * factor;

      let pricePerGramKaratInr: number | undefined;
      let totalInr: number | undefined;

      if (!Number.isNaN(grams) && grams > 0) {
        pricePerGramKaratInr = pricePerGram24kInr * purityFactor;
        totalInr = pricePerGramKaratInr * grams;
      }

      return {
        label: s.label,
        description: s.description,
        changePct: s.changePct,
        pricePerGram24kInr,
        pricePerGramKaratInr,
        totalInr,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      daysAhead,
      currentPricePerGram24kInr,
      scenarios,
      note: "These are simple example scenarios using fixed percentage changes around today's price. They are not real predictions and not financial advice.",
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in /api/predict:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Something went wrong on the server while building the price scenarios.",
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}