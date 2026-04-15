"use client";

import { useParams, redirect } from "next/navigation";

export default function InvoiceEditPage() {
  const params = useParams();
  const id = params.id as string;
  redirect(`/invoices/new?edit=${id}`);
}
