import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");
    const mimeType = searchParams.get("mimeType");

    if (!key || !mimeType) {
      return NextResponse.json(
        { error: "Missing key or mimeType" },
        { status: 400 }
      );
    }

    // Stub: retourner une URL signée simulée
    // TODO: Implémenter avec votre service S3/GCS
    const uploadUrl = `/api/upload/put?key=${key}&mimeType=${mimeType}`;

    return NextResponse.json({
      uploadUrl,
      fileKey: key,
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Stub: simuler l'upload
    // TODO: Implémenter avec votre service S3/GCS
    const body = await request.arrayBuffer();

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully (stub)",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}














