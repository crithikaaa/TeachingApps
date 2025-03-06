import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("❌ Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Move this function elsewhere (e.g., API route or manual testing in UI)
export async function testSupabase() {
    try {
        const { data, error } = await supabase.from("scenarios").select("*");
        if (error) throw error;
        console.log("✅ Supabase Connection Successful:", data);
    } catch (err) {
        console.error("❌ Supabase Test Failed:", err);
    }
}