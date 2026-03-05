"use client";

import { useEffect } from "react";

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // Only count once per session per post
    const key = `viewed_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/posts/${slug}/views`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
