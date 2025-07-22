import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { defaultCategories, defaultEnvelopes } from "@/lib/default-data";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      console.log("🚀 Starting My Budget Mate app...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.warn("No Supabase user session found.");
        return;
      }

      const userId = session.user.id;
      console.log("✅ Supabase user ID:", userId);

      // 👇 Check for existing envelopes
      const { data: envelopes, error } = await supabase
        .from("envelopes")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Error checking envelopes:", error.message);
        return;
      }

      if (!envelopes || envelopes.length === 0) {
        console.log("🌱 First-time user — creating starter envelopes and categories...");

        // Step 1: Insert envelope categories
        const categoriesToInsert = defaultCategories.map((cat, i) => ({
          ...cat,
          user_id: userId,
          sort_order: i,
        }));

        const { data: insertedCats, error: catError } = await supabase
          .from("envelope_categories")
          .insert(categoriesToInsert)
          .select();

        if (catError || !insertedCats) {
          console.error("❌ Failed to insert default categories:", catError?.message);
          return;
        }

        // Step 2: Insert envelopes linked to those categories
        const envelopesToInsert = defaultEnvelopes.map((env, i) => {
          const matchingCat = insertedCats.find((c) => c.name === env.category);
          return {
            ...env,
            user_id: userId,
            category_id: matchingCat?.id || null,
            sort_order: i,
          };
        });

        const { error: envError } = await supabase
          .from("envelopes")
          .insert(envelopesToInsert);

        if (envError) {
          console.error("❌ Failed to insert default envelopes:", envError.message);
        } else {
          console.log("✅ Starter envelopes and categories created!");
        }
      }
    };

    init();
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
