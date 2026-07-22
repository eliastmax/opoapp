type DisplayNameInput = {
  profileName?: string | null;
  metadataName?: unknown;
  email?: string | null;
};

export function displayName({ profileName, metadataName, email }: DisplayNameInput): string {
  const profile = profileName?.trim();
  if (profile) return profile;

  const metadata = typeof metadataName === "string" ? metadataName.trim() : "";
  if (metadata) return metadata;

  const emailName = email?.split("@")[0]?.trim();
  return emailName || "estudiante";
}
