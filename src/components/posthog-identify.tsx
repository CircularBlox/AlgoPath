"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { createClient } from "~/lib/supabase/client";

export function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        posthog.identify(user.id, { email: user.email });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user
        ) {
          posthog.identify(session.user.id, { email: session.user.email });
        } else if (event === "SIGNED_OUT") {
          posthog.reset();
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
