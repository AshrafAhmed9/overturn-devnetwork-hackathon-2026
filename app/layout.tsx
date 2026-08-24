import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Overturn — Claims deserve a second look",
  description: "Find a contradiction, draft an appeal, and keep filing under human control."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
