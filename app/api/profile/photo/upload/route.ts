import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (typeof pathname !== "string" || pathname.trim().length === 0) {
          throw new Error("Invalid pathname");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 3 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: user.id,
            uploadedFor: "profile-photo",
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const parsed =
            typeof tokenPayload === "string" ? JSON.parse(tokenPayload) : null;

          console.log("Profile photo uploaded", {
            userId: parsed?.userId ?? user.id,
            url: blob.url,
            pathname: blob.pathname,
            size: blob.size,
            contentType: blob.contentType,
          });
        } catch (error) {
          console.error("Error parsing upload token payload:", error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("/api/profile/photo/upload error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload error" },
      { status: 400 }
    );
  }
}