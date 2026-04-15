"use client";

import { useParams, redirect } from "next/navigation";

export default function PurchaseEditPage() {
  const params = useParams();
  const id = params.id as string;
  redirect(`/purchases/new?edit=${id}`);
}
