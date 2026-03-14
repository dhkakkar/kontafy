import type { Metadata } from "next";
import SwitchFromTallyClient from "./SwitchFromTallyClient";

export const metadata: Metadata = {
  title: "Switch from Tally to Kontafy — Kontafy",
  description:
    "Step-by-step migration guide to move from Tally to Kontafy in 48 hours. Free migration, zero data loss, dedicated support.",
};

export default function SwitchFromTallyPage() {
  return <SwitchFromTallyClient />;
}
