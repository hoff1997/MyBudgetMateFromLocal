// client/src/app.tsx

import { useEffect, useState } from "react";
import { defaultEnvelopeCategories, defaultEnvelopes } from "@/lib/default-data";
import { supabase } from "@/lib/supabase";

export default function App() {
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const user = (await supabase.auth.getUser())?.data?.user;
      if (!user) {
        console.warn("🔒 No user found.");
        return;
      }

      const { data: existingEnvelopes, error } = await supabase
        .from("envelopes")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Error fetching envelopes:", error);
        return;
      }

      if (!existingEnvelopes || existingEnvelopes.length === 0) {
        console.log("🚀 First-time user detected — creating starter envelopes/categories...");

        for (const category of defaultEnvelopeCategories) {
          const { data: cat, error: catErr } = await supabase
            .from("envelope_categories")
            .insert([{ ...category, user_id: user.id }])
            .select()
            .single();

          if (catErr) {
            console.error("⚠️ Error inserting category", category.name, catErr);
            continue;
          }

          const categoryName = category.name;
          const envelopesForCategory = defaultEnvelopes.filter(e => e.category === categoryName);

          for (const env of envelopesForCategory) {
            await supabase.from("envelopes").insert([{
              ...env,
              user_id: user.id,
              category_id: cat.id,
            }]);
          }
        }
      }

      setEnvelopes(existingEnvelopes);
      setLoading(false);
    };

    init();
  }, []);

  if (loading) return <div className="p-4 text-muted">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Welcome to My Budget Mate</h1>
      <pre>{JSON.stringify(envelopes, null, 2)}</pre>
    </div>
  );
}
