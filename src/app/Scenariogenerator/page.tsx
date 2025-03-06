"use client";
import { useState, useEffect } from "react";
import { saveScenario } from "@/app/Scenariogenerator/utils/localStorage";
import { supabase } from "@/lib/supabase";  // Updated import path

interface Scenario {
  id?: string;  // Add id for Supabase records
  prompt: string;
  response: string;
  created_at?: string;
}

export default function ScenarioGenerator() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [viewingScenario, setViewingScenario] = useState<number | null>(null);

  // Detect system theme (Dark/Light mode)
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(darkModeMediaQuery.matches ? "dark" : "light");

    const handleChange = (e: MediaQueryListEvent): void => setTheme(e.matches ? "dark" : "light");
    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    fetchSavedScenarios();
  }, []);

  const generateScenario = async () => {
    if (!input.trim()) {
      setError("Please enter a concept to generate a real-world scenario.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse("");

    try {
      // Check for existing scenario first
      const { data: existing } = await supabase
        .from('scenarios')
        .select('*')
        .ilike('prompt', input.trim())
        .single();

      if (existing) {
        setResponse(existing.response);
        setInput("");
        setSavedScenarios(prev =>
          prev.find(s => s.id === existing.id) ? prev : [existing, ...prev]
        );
        return;
      }

      // Generate new scenario
      const res = await fetch("/api/generateScenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          prompt: `Explain ${input} with a real-world example that a layman can understand, making it relatable to daily life and conclude it.`
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.scenario) {
        throw new Error("Invalid response format");
      }

      const formattedScenario = formatScenarioOutput(data.scenario);
      
      // Save and update state in one go
      const savedScenario = await saveScenario(input.trim(), formattedScenario);
      setResponse(formattedScenario);
      setInput("");
      setSavedScenarios(prev => [savedScenario, ...prev]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Error generating scenario. Please try again.");
      } else {
        setError("Error generating scenario. Please try again.");
      }
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedScenarios = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      // Ensure uniqueness by prompt
      const seen = new Set();
      const uniqueScenarios = (data || []).filter(scenario => {
        const normalizedPrompt = scenario.prompt.toLowerCase().trim();
        const isDuplicate = seen.has(normalizedPrompt);
        seen.add(normalizedPrompt);
        return !isDuplicate;
      });

      setSavedScenarios(uniqueScenarios);
    } catch (err) {
      console.error("Error fetching scenarios:", err);
      setSavedScenarios([]);
    }
  };

  interface FormattedText {
    text: string;
  }

  const formatScenarioOutput = (text: string): string => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  };

  const handleCopyScenario = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  const handleDeleteScenario = async (index: number) => {
    try {
      const scenario = savedScenarios[index];
      
      // Delete from Supabase
      const { error: supabaseError } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', scenario.id);  // Use ID instead of prompt

      if (supabaseError) {
        throw supabaseError;
      }

      // Update local state
      const updatedScenarios = savedScenarios.filter((_, idx) => idx !== index);
      setSavedScenarios(updatedScenarios);
    } catch (error) {
      console.error('Error deleting scenario:', error);
      setError('Failed to delete scenario');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start pt-20 ${
      theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
    }`}>
      <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-lg border ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
      }`}>
        <h2 className="text-3xl font-bold text-pink-600 text-center mb-4">
          Real-World Scenario Generator
        </h2>
        <p className="  text-1xl text-center  text-gray-600 mb-4">
          Generate realistic scenario prompts for your projects, stories, or games.
        </p>
        <input
          type="text"
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-600 focus:outline-none mb-4 ${
            theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-700 border-gray-300"
          }`}
          placeholder="Enter a scenario prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={generateScenario}
          className="w-full p-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-600 transition mb-4"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Scenario"}
        </button>
        {error && <p className="mt-4 text-pink-500 text-sm">{error}</p>}
      </div>

      {/* Generated Scenario Output */}
      {response && (
        <div className={`mt-6 p-6 rounded-2xl shadow-lg w-full max-w-2xl border ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"
        }`}>
          <h3 className={`text-lg font-semibold ${
            theme === "dark" ? "text-white" : "text-gray-700"
          }`}>
            Generated Scenario:
          </h3>
          <p className={theme === "dark" ? "text-gray-300" : "text-gray-600"} dangerouslySetInnerHTML={{ __html: response }}></p>
        </div>
      )}
      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <div className="mt-10 w-full max-w-2xl">
          <h3 className="text-2xl font-bold text-pink-500 text-center mb-4">Saved Scenarios</h3>
          <ul className="space-y-4">
            {savedScenarios.map((scenario, index) => (
              <li key={index} className={`p-4 border rounded-lg shadow-sm ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-100 border-gray-300 text-pink-600"
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-lg">{scenario.prompt}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewingScenario(viewingScenario === index ? null : index)}
                      className="p-2 rounded-full hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900 dark:hover:text-pink-400"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleCopyScenario(scenario.response)}
                      className="p-2 rounded-full hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900 dark:hover:text-pink-400"
                      title="Copy"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(index)}
                      className="p-2 rounded-full hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                {viewingScenario === index && (
                  <div className={`mt-2 p-3 rounded ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <p className="text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: scenario.response }}></p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
