/** Web preview build: saving to Photos and the share sheet are iPhone-only. */
export type SaveResult = "saved" | "denied" | "unsupported";

export async function savePinToPhotos(_pinId: string, _filename: string): Promise<SaveResult> {
  return "unsupported";
}

export async function sharePin(_pinId: string, _filename: string): Promise<boolean> {
  return false;
}
