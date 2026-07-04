import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Uploads are only allowed for authenticated LandChain users — the client
 *  forwards its API bearer token, which we validate against the backend. */
async function authenticate(req: Request): Promise<{ id: string }> {
  const header = req.headers.get("authorization");
  if (!header) throw new UploadThingError("You must be logged in to upload files");
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { authorization: header },
    cache: "no-store",
  });
  if (!res.ok) throw new UploadThingError("You must be logged in to upload files");
  return res.json();
}

export const uploadRouter = {
  /** KYC assets: ID documents and selfies (images only). */
  kycDocument: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const user = await authenticate(req);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  /** Land documents: titles, survey plans, agreements (image or PDF). */
  landDocument: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const user = await authenticate(req);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
