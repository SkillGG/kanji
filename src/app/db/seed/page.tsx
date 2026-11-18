import type { Metadata } from "next/dist/types";
import Seed from "./seed";

export const metadata: Metadata = {
  title: "Seed DB",
};

export default function Page() {
  return <Seed />;
}
