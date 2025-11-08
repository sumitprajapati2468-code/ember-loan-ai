import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sales Agent - Calculates EMI and presents loan options
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { loanAmount, interestRate = 10.5, tenureMonths = 36 } = await req.json();

    if (!loanAmount || loanAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid loan amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate EMI using formula: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
    const P = loanAmount;
    const R = interestRate / 12 / 100; // Monthly interest rate
    const N = tenureMonths;

    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    // Generate multiple tenure options
    const options = [24, 36, 48, 60].map((tenure) => {
      const monthlyRate = interestRate / 12 / 100;
      const monthlyEmi = (P * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                         (Math.pow(1 + monthlyRate, tenure) - 1);
      const total = monthlyEmi * tenure;
      const interest = total - P;

      return {
        tenure,
        emi: Math.round(monthlyEmi),
        totalPayment: Math.round(total),
        totalInterest: Math.round(interest),
        interestRate,
      };
    });

    return new Response(
      JSON.stringify({
        requestedEmi: Math.round(emi),
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest),
        options,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Loan calculator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
