"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type AmbientPlayerType from "./AmbientPlayer";
import type WritingReplayType from "./WritingReplay";
import type CommentSectionType from "./CommentSection";

// Heavy / below-the-fold widgets, deferred to client-only chunks so they stay
// out of the post page's initial JS and hydration work. None are SEO-critical:
// AmbientPlayer renders nothing until interacted with, WritingReplay is a
// player, and comments are supplementary content.
const AmbientPlayer = dynamic(() => import("./AmbientPlayer"), { ssr: false });
const WritingReplay = dynamic(() => import("./WritingReplay"), { ssr: false });
const CommentSection = dynamic(() => import("./CommentSection"), { ssr: false });

export function AmbientPlayerLazy(props: ComponentProps<typeof AmbientPlayerType>) {
  return <AmbientPlayer {...props} />;
}

export function WritingReplayLazy(props: ComponentProps<typeof WritingReplayType>) {
  return <WritingReplay {...props} />;
}

export function CommentSectionLazy(props: ComponentProps<typeof CommentSectionType>) {
  return <CommentSection {...props} />;
}
