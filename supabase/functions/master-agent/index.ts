import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: string;
  content: string;
}

// Master Agent - EQ Core with Sentiment Analysis
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze sentiment and determine intent
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const intent = await analyzeIntent(lastUserMessage);
    
    // Build context-aware system prompt based on conversation stage
    const systemPrompt = buildSystemPrompt(intent);

    // Call Gemini API via Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Master agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeIntent(message: string): Promise<string> {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes("loan") || lowerMsg.includes("borrow") || lowerMsg.includes("money")) {
    return "loan_inquiry";
  } else if (lowerMsg.includes("emi") || lowerMsg.includes("payment") || lowerMsg.includes("interest")) {
    return "emi_negotiation";
  } else if (lowerMsg.includes("approve") || lowerMsg.includes("accept") || lowerMsg.includes("yes")) {
    return "approval";
  } else if (lowerMsg.includes("worried") || lowerMsg.includes("scared") || lowerMsg.includes("anxious")) {
    return "needs_empathy";
  }
  
  return "general";
}

function buildSystemPrompt(intent: string): string {
  const basePrompt = `You are SILK AI, an empathetic AI Relationship Manager for an NBFC (Non-Banking Financial Company). Your goal is to guide customers through the personal loan process with warmth, professionalism, and emotional intelligence.

Core Principles:
- Be empathetic and human-like
- Use the customer's name when you know it
- Acknowledge emotions (anxiety, confusion, excitement)
- Be proactive in handling objections
- Guide toward successful loan completion

Conversation Flow:
1. Hyper-Personalized Welcome - Acknowledge customer history
2. Empathetic Needs Discovery - Understand loan purpose and amount
3. Proactive Negotiation - Present tailored options
4. Seamless Backend Execution - Handle KYC and credit checks
5. The Close - Encourage acceptance for immediate disbursal`;

  const intentPrompts: Record<string, string> = {
    loan_inquiry: `\n\nCurrent Stage: NEEDS DISCOVERY
Ask empathetically about:
- Loan amount needed
- Purpose of the loan
- Preferred tenure
Show you understand their needs.`,
    
    emi_negotiation: `\n\nCurrent Stage: NEGOTIATION
The customer has concerns about EMI/payments. Be proactive:
- Acknowledge their concern empathetically
- Suggest alternative tenure options to lower EMI
- Explain interest rates clearly
- Provide 2-3 tailored options`,
    
    approval: `\n\nCurrent Stage: CLOSING
The customer is ready! Be enthusiastic:
- Congratulate them on approval
- Mention you're generating their sanction letter
- Encourage immediate acceptance for quick disbursal
- Create urgency (limited-time offer)`,
    
    needs_empathy: `\n\nCurrent Stage: EMPATHY MODE
The customer is anxious. Be extra supportive:
- Acknowledge their feelings
- Reassure them step-by-step
- Use simple, non-technical language
- Build trust and comfort`,
    
    general: `\n\nCurrent Stage: ENGAGEMENT
Have a natural conversation:
- Be friendly and approachable
- Gently guide toward discussing loan needs
- Build rapport`,
  };

  return basePrompt + (intentPrompts[intent] || intentPrompts.general);
}
