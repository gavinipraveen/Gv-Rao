"use client";

import React, { useState } from "react";

// --- Types ---

interface EstimateResponse {
  success: boolean;
  message?: string;
  pricePerGram24kInr: number;
  pricePerGramKaratInr: number;
  totalPriceInr: number;
}

interface Scenario {
  label: string;
  description: string;
  changePct: number;
  pricePerGram24kInr: number;
  pricePerGramKaratInr?: number;
  totalInr?: number;
}

interface PredictResponse {
  success: boolean;
  message?: string;
  daysAhead?: number;
  currentPricePerGram24kInr?: number;
  scenarios?: Scenario[];
  note?: string;
}

// --- Icons ---

const IconInfo = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
  </svg>
);

const IconChart = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const IconTrendUp = () => (
   <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const IconTrendDown = () => (
   <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
);
const IconTrendFlat = () => (
   <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);

// --- Constants ---
const API_KEY = "a822916b3f448af49936f0cf7ec84ff0"; 
const OUNCE_TO_GRAM = 31.1034768;

export default function Home() {
  // --- State ---
  const [grams, setGrams] = useState<string>("10");
  const [karat, setKarat] = useState<number>(22);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [predictLoading, setPredictLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  // --- Helpers ---

  const formatInr = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return "₹ " + value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatPct = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // --- Handlers ---

  const handleEstimate = async () => {
    setError(null);
    setResult(null);
    setPrediction(null);
    setPredictError(null);

    if (!grams || parseFloat(grams) <= 0) {
      setError("Please enter a weight greater than 0 grams.");
      return;
    }

    setLoading(true);

    try {
      const gramsNum = parseFloat(grams);
      const params = new URLSearchParams({ grams: grams, karat: String(karat) });

      // --- Attempt 1: Call API Route for Estimate ---
      let estimateData: EstimateResponse | null = null;
      try {
        const res = await fetch(`/api/estimate?${params.toString()}`);
        if (res.ok) {
           estimateData = await res.json();
        } else if (res.status === 404) {
           throw new Error("404");
        } else {
           const errJson = await res.json().catch(() => ({}));
           throw new Error(errJson.message || "API Error");
        }
      } catch (e) {
        // --- Fallback: Client-side Estimate ---
        console.warn("Using client-side estimate fallback due to:", e);
        const latestUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=INR&currencies=XAU`;
        const resLatest = await fetch(latestUrl);
        if (!resLatest.ok) throw new Error("Failed to connect to Gold Price API");
        const dataLatest = await resLatest.json();
        if (!dataLatest.success || !dataLatest.rates || typeof dataLatest.rates.INRXAU !== 'number') {
          throw new Error("Invalid data received from API");
        }
        const pricePerOunceInr = dataLatest.rates.INRXAU;
        const pricePerGram24kInr = pricePerOunceInr / OUNCE_TO_GRAM;
        const purityFactor = karat / 24;
        const pricePerGramKaratInr = pricePerGram24kInr * purityFactor;
        const totalPriceInr = pricePerGramKaratInr * gramsNum;
        
        estimateData = {
          success: true,
          pricePerGram24kInr,
          pricePerGramKaratInr,
          totalPriceInr
        };
      }

      if (estimateData && estimateData.success) {
        setResult(estimateData);
        // If estimate successful, trigger prediction
        if (estimateData.pricePerGram24kInr) {
            fetchPrediction(gramsNum, karat, estimateData.pricePerGram24kInr);
        }
      } else {
         setError(estimateData?.message || "Could not calculate estimate.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async (gramsNum: number, karatNum: number, currentPrice24k: number) => {
    setPredictLoading(true);
    setPredictError(null);
    const daysAhead = 30;

    try {
      const params = new URLSearchParams({
        grams: String(gramsNum),
        karat: String(karatNum),
        daysAhead: String(daysAhead),
        currentPrice24k: String(currentPrice24k)
      });

      let predictData: PredictResponse | null = null;

      try {
         // --- Attempt 1: Call API Route ---
         const res = await fetch(`/api/predict?${params.toString()}`);
         if (res.ok) {
           predictData = await res.json();
         } else if (res.status === 404) {
           throw new Error("404");
         } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message);
         }
      } catch (e) {
         // --- Fallback: Client-side Prediction Generation ---
         console.warn("Using client-side prediction fallback");
         
         // Generate the scenarios client-side to match the API logic
         const basePercent = (daysAhead / 30) * 10;
         const maxPercent = 25;
         const band = Math.min(basePercent, maxPercent);

         const scenariosRaw = [
            { label: "Cautious", description: "Price eases down slightly", changePct: -band },
            { label: "Stable", description: "Price holds steady", changePct: 0 },
            { label: "Optimistic", description: "Price trends upward", changePct: band },
         ];

         const purityFactor = karatNum / 24;
         const scenarios = scenariosRaw.map(s => {
             const factor = 1 + s.changePct / 100;
             const price24 = currentPrice24k * factor;
             const priceKarat = price24 * purityFactor;
             const total = priceKarat * gramsNum;
             return {
                 label: s.label,
                 description: s.description,
                 changePct: s.changePct,
                 pricePerGram24kInr: price24,
                 pricePerGramKaratInr: priceKarat,
                 totalInr: total
             };
         });

         predictData = {
             success: true,
             daysAhead,
             currentPricePerGram24kInr: currentPrice24k,
             scenarios,
             note: "These are simple example scenarios using fixed percentage changes. Not financial advice."
         };
      }

      if (predictData && predictData.success) {
        setPrediction(predictData);
      } else {
        setPredictError(predictData?.message || "Prediction failed.");
      }

    } catch (err: any) {
      console.error(err);
      setPredictError("Could not build price scenarios right now.");
    } finally {
      setPredictLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex items-center justify-center p-4 font-sans text-slate-50">
      <div className="w-full max-w-md">
        
        {/* Main Card */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
          
          {/* Header */}
          <div className="p-6 pb-4 text-center border-b border-slate-700/50 bg-gradient-to-b from-slate-800/80 to-slate-800/20">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              GV RAO’S Gold Estimator
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              India's simple gold value calculator
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* How to use */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                <IconInfo className="w-4 h-4" />
                How to use:
              </h3>
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside marker:text-blue-500/50">
                <li>Enter gold weight in grams</li>
                <li>Select purity (Karat)</li>
                <li>Tap button to see value & scenarios</li>
              </ol>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
              
              {/* Grams Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  Weight in grams
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    className="block w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner group-hover:border-slate-500"
                    placeholder="e.g. 10"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-bold pointer-events-none">
                    grams
                  </span>
                </div>
              </div>

              {/* Karat Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  Purity (Karat)
                </label>
                <div className="relative group">
                  <select
                    value={karat}
                    onChange={(e) => setKarat(Number(e.target.value))}
                    className="block w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3.5 px-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner group-hover:border-slate-500 cursor-pointer"
                  >
                    <option value={24}>24K (99.9% - Pure)</option>
                    <option value={22}>22K (91.6% - Jewellery)</option>
                    <option value={18}>18K (75.0%)</option>
                    <option value={14}>14K (58.3%)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleEstimate}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] border border-transparent
                  ${loading 
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600" 
                    : "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-900 hover:shadow-amber-500/25"}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <span>Show my gold value (₹)</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="animate-pulse bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg p-4 text-sm flex gap-3 items-start break-words">
                <span className="text-xl">⚠️</span>
                <span className="mt-0.5">{error}</span>
              </div>
            )}

            {/* Results Section */}
            {result && result.success && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 rounded-xl overflow-hidden shadow-2xl relative">
                   <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50"></div>
                   
                   {/* Breakdown */}
                   <div className="p-5 space-y-3 bg-slate-900/20">
                     <div className="flex justify-between items-center text-sm text-slate-400 border-b border-slate-700/50 pb-2">
                       <span>24K price per gram</span>
                       <span className="font-mono text-slate-200 tracking-wide">{formatInr(result.pricePerGram24kInr)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm text-slate-300">
                       <span className="font-medium">{karat}K price per gram</span>
                       <span className="font-mono text-amber-200 tracking-wide">{formatInr(result.pricePerGramKaratInr)}</span>
                     </div>
                   </div>

                   {/* Total */}
                   <div className="bg-slate-700/30 p-6 flex flex-col items-center justify-center gap-1 text-center backdrop-blur-sm">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Estimated Value</span>
                     <span className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 drop-shadow-sm mt-1">
                       {formatInr(result.totalPriceInr)}
                     </span>
                     <span className="text-xs text-slate-500 mt-1 font-medium bg-slate-900/40 px-2 py-1 rounded-full border border-slate-700/50">
                       {grams} g • {karat}K purity
                     </span>
                   </div>
                </div>
              </div>
            )}
            
            {/* Scenarios Section */}
            {(result?.success) && (
               <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-5 space-y-4 animate-in fade-in duration-1000 mt-2">
                 
                 <div className="flex items-center gap-2 border-b border-slate-700/50 pb-3">
                   <IconChart className="w-5 h-5 text-purple-400" />
                   <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                     AI Price Trend Forecast
                   </h3>
                   <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-auto">Next 30 Days</span>
                 </div>

                 {predictLoading && (
                   <div className="flex flex-col items-center justify-center py-4 gap-2 text-xs text-slate-400">
                     <div className="flex gap-1">
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                       <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                     </div>
                     Building scenarios...
                   </div>
                 )}

                 {predictError && !predictLoading && (
                   <p className="text-xs text-red-400 bg-red-900/10 p-3 rounded border border-red-900/20">
                     {predictError}
                   </p>
                 )}

                 {prediction && prediction.success && prediction.scenarios && !predictLoading && (
                   <div className="space-y-4">
                     <div className="grid gap-3">
                        {prediction.scenarios.map((s, i) => (
                           <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800/60 transition-colors">
                              <div className="flex justify-between items-center mb-1">
                                 <div className="flex items-center gap-2">
                                    {s.changePct > 0 ? <IconTrendUp/> : s.changePct < 0 ? <IconTrendDown/> : <IconTrendFlat/>}
                                    <span className={`font-bold text-sm ${s.changePct > 0 ? 'text-emerald-300' : s.changePct < 0 ? 'text-red-300' : 'text-blue-200'}`}>{s.label}</span>
                                 </div>
                                 <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                    {formatPct(s.changePct)}
                                 </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mb-2 pl-6 leading-tight">{s.description}</p>
                              <div className="flex justify-between items-center text-xs pl-6 border-t border-slate-700/30 pt-2">
                                 <span className="text-slate-400">Value:</span>
                                 <span className="font-mono font-bold text-slate-200">{formatInr(s.totalInr)}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                     
                     <p className="text-[10px] text-slate-500 italic text-center px-2 leading-relaxed opacity-70">
                       {prediction.note}
                     </p>
                   </div>
                 )}
               </div>
            )}

          </div>

          {/* Footer Disclaimer */}
          <div className="bg-slate-900/90 p-4 text-center border-t border-slate-800">
             <p className="text-[10px] text-slate-500 leading-normal mx-auto">
               This is only an approximate estimate for Indian gold prices. Actual jeweller prices will be different because of making charges, taxes, city-wise rates and other factors.
             </p>
          </div>

        </div>
      </div>
    </main>
  );
}