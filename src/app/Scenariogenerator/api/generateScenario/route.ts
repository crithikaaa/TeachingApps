import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("scenarios")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5);

        if (error) {
            console.error("❌ Supabase Fetch Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("📥 Fetching Previous Scenarios:", data);
        return NextResponse.json({ scenarios: data });
    } catch (error: any) {
        console.error("❌ Internal Server Error:", error);
        return NextResponse.json({ error: `${error.message}, Server error` }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is missing" }, { status: 400 });
        }

        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            return NextResponse.json({ error: `Groq API Error: ${errorText}` }, { status: aiResponse.status });
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.choices[0]?.message?.content|| "No response generated.";

        return NextResponse.json({ scenario: generatedText });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}