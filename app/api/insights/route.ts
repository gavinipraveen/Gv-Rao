export const dynamic = 'force-dynamic';

type Level = "high" | "normal" | "low";

export async function GET(req: Request) {
  try {
    // 1. Check API Key
    const apiKey = process.env.METALPRICE_API_KEY || "a822916b3f448af49936f0cf7ec84ff0";
    
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, message: "Server is not configured with METALPRICE_API_KEY." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Fetch Latest Price (needed for the response interface)
    const latestUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=INR&currencies=XAU`;
    const changeUrl = `https://api.metalpriceapi.com/v1/change?api_key=${apiKey}&date_type=year&base=INR&currencies=XAU`;

    const [resLatest, resChange] = await Promise.all([
      fetch(latestUrl, { cache: "no-store" }),
      fetch(changeUrl, { cache: "no-store" })
    ]);

    // Process Latest Price
    let pricePerGram24kInr = 0;
    if (resLatest.ok) {
      const dataLatest = await resLatest.json();
      if (dataLatest && dataLatest.rates && typeof dataLatest.rates.INRXAU === "number") {
        const OUNCE_TO_GRAM = 31.1034768;
        pricePerGram24kInr = dataLatest.rates.INRXAU / OUNCE_TO_GRAM;
      }
    }

    // Process Change
    let oneYearChangePct: number | null = null;
    if (resChange.ok) {
      const dataChange = await resChange.json();
      if (dataChange.success && dataChange.rates && dataChange.rates.XAU) {
        const xauChange = dataChange.rates.XAU;
        
        if (typeof xauChange.change_pct === "number") {
          // Assuming decimal input (e.g. 0.1739 => 17.39%)
          oneYearChangePct = xauChange.change_pct * 100;
        } else if (
          typeof xauChange.start_rate === "number" &&
          typeof xauChange.end_rate === "number" &&
          xauChange.start_rate !== 0
        ) {
          oneYearChangePct = ((xauChange.end_rate - xauChange.start_rate) / xauChange.start_rate) * 100;
        }
      }
    }

    // 4. Determine Level
    let level: Level = "normal";
    if (oneYearChangePct !== null) {
      if (oneYearChangePct > 10) level = "high";
      else if (oneYearChangePct < -10) level = "low";
      else level = "normal";
    }

    // 5. Build Messages
    let messageShort = "";
    let messageAdvice = "";

    if (level === "high") {
      messageShort = "Compared to 1 year ago, gold prices are relatively HIGH right now.";
      messageAdvice = "When prices are high, many long-term buyers do not put all their money at once. They often buy slowly in small parts over time. Prices can still go up or down, so this is not a guarantee and not financial advice.";
    } else if (level === "low") {
      messageShort = "Compared to 1 year ago, gold prices are relatively LOW right now.";
      messageAdvice = "Prices are lower than last year. Some buyers feel more comfortable starting or adding at lower levels. But prices can still fall or rise further, so this is not a sure 'best time' and not financial advice.";
    } else {
      messageShort = "Compared to 1 year ago, gold prices are in a MIDDLE or NORMAL range.";
      messageAdvice = "Prices are close to the average of last year. In such times, many people focus on their long-term plan instead of trying to guess the exact bottom or top. Splitting purchases over time can reduce stress, but this is not financial advice.";
    }

    // 6. Return JSON
    return new Response(JSON.stringify({
      success: true,
      pricePerGram24kInr,
      oneYearChangePct,
      level,
      messageShort,
      messageAdvice
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Insights API Error:", error);
    return new Response(JSON.stringify({ success: false, message: "Could not load market insight data right now. Please try again later." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}