import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

interface SanityWebhookBody {
  _type?: string;
  _id?: string;
  slug?: { current: string };
}

const TAG_MAP: Record<string, string> = {
  post: "posts",
  page: "pages",
  author: "posts", // author changes can affect post listings
  category: "categories",
};

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.headers.get("x-sanity-webhook-secret");
    const expectedSecret = process.env.SANITY_WEBHOOK_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Webhook secret not configured on server." },
        { status: 500 },
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Invalid webhook secret." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as SanityWebhookBody;
    const documentType = body._type;

    if (!documentType) {
      return NextResponse.json(
        { success: false, message: "Missing document _type in webhook payload." },
        { status: 400 },
      );
    }

    const tag = TAG_MAP[documentType];

    if (tag) {
      revalidateTag(tag, "default");
      return NextResponse.json({
        success: true,
        revalidated: true,
        tag,
        documentType,
      });
    }

    return NextResponse.json({
      success: true,
      revalidated: false,
      message: `No revalidation rule for document type "${documentType}".`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
