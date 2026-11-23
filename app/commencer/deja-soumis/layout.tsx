import { NO_INDEX_METADATA } from "@/lib/seo/no-index";

export const metadata = NO_INDEX_METADATA;

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
