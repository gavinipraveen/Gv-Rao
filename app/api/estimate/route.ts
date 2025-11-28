export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gramsParam = searchParams.get("grams");
    const karatParam = searchParams.get("karat");

    // 1. Parse query parameters
    const grams = parseFloat(gramsParam || "0");
    const karat = parseFloat(karatParam || "24");

    // 2. Validate inputs
    if (grams <= 0) {
      return new Response(JSON.stringify({ success: false, message: "Please enter a valid weight in grams." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (karat <= 0 || karat > 24) {
      return new Response(JSON.stringify({ success: false, message: "Purity (karat) must be between 1 and 24." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Read API key
    const apiKey = process.env.METALPRICE_API_KEY || "a822916b3f448af49936f0cf7ec84ff0";
    
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, message: "Server is not configured with METALPRICE_API_KEY." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Call MetalpriceAPI
    const apiUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=INR&currencies=XAU`;
    const response = await fetch(apiUrl, { cache: "no-store" });

    // 5. Validate response
    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, message: "Failed to fetch gold price from the external API." }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    if (!data || !data.rates || typeof data.rates.INRXAU !== "number") {
      return new Response(JSON.stringify({ success: false, message: "Received an unexpected response from the gold price API." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Compute
    const OUNCE_TO_GRAM = 31.1034768;
    const pricePerOunceInr = data.rates.INRXAU;
    const pricePerGram24kInr = pricePerOunceInr / OUNCE_TO_GRAM;

    const purityFactor = karat / 24;
    const pricePerGramKaratInr = pricePerGram24kInr * purityFactor;

    const totalPriceInr = pricePerGramKaratInr * grams;

    // 7. Return JSON
    return new Response(JSON.stringify({
      success: true,
      pricePerGram24kInr,
      pricePerGramKaratInr,
      totalPriceInr,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Estimate API Error:", error);
    return new Response(JSON.stringify({ success: false, message: "Something went wrong on the server while calculating the estimate." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}