import type { Metadata } from "next";
import CommunityClientShell from "../CommunityClientShell";

export const metadata: Metadata = {
  title: "旅行社区 · fly everything",
  description: "发布、浏览和收藏带有真实载具与站点信息的旅行行程。",
};

export default function CommunityPage() {
  return <CommunityClientShell />;
}
