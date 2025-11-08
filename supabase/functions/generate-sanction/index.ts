import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanction Letter Agent - Generates PDF sanction letter
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { conversationId, loanAmount, tenure, emi, interestRate } = await req.json();

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch customer profile
    const { data: profile } = await supabaseClient
      .from("customer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Generate HTML for PDF (we'll use a simple HTML-to-PDF approach)
    const sanctionDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #0891b2; }
        .content { margin-top: 30px; line-height: 1.8; }
        .details { background: #f0f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #0891b2; }
        .signature { margin-top: 60px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏦 SILK FINANCE</div>
        <p>Your Trusted Financial Partner</p>
      </div>
      
      <div class="content">
        <p><strong>Date:</strong> ${sanctionDate}</p>
        <p><strong>Reference No:</strong> SILK-${Date.now().toString().slice(-8)}</p>
        
        <h2>LOAN SANCTION LETTER</h2>
        
        <p>Dear ${profile?.full_name || "Valued Customer"},</p>
        
        <p>We are pleased to inform you that your personal loan application has been <strong>APPROVED</strong>!</p>
        
        <div class="details">
          <h3>Loan Details:</h3>
          <p><strong>Sanctioned Amount:</strong> ₹${loanAmount?.toLocaleString("en-IN")}</p>
          <p><strong>Interest Rate:</strong> ${interestRate}% per annum</p>
          <p><strong>Tenure:</strong> ${tenure} months</p>
          <p><strong>Monthly EMI:</strong> ₹${emi?.toLocaleString("en-IN")}</p>
          <p><strong>Processing Fee:</strong> ₹${Math.round(loanAmount * 0.02).toLocaleString("en-IN")} (2% of loan amount)</p>
        </div>
        
        <p>This sanction is valid for <strong>30 days</strong> from the date of this letter. To proceed with the disbursal, please accept this offer in the chat interface.</p>
        
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Accept the offer in the chat</li>
          <li>Complete KYC verification (if pending)</li>
          <li>Sign the loan agreement digitally</li>
          <li>Receive instant disbursal to your account</li>
        </ul>
        
        <div class="signature">
          <p><strong>Authorized Signatory</strong><br>
          SILK Finance Limited<br>
          Registration No: U65999MH2020PTC123456</p>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated document and does not require a physical signature.</p>
          <p>SILK Finance Ltd. | Registered Office: Mumbai, India | CIN: U65999MH2020PTC123456</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Update conversation status
    await supabaseClient
      .from("conversations")
      .update({
        approval_status: "approved",
        loan_status: "sanctioned",
        loan_amount: loanAmount,
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({
        success: true,
        sanctionLetter: htmlContent,
        referenceNo: `SILK-${Date.now().toString().slice(-8)}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sanction generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
