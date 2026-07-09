import type { SshProfile } from "@/types/ssh";

export function buildSshCommand(profile: SshProfile): string {
  const parts = ["ssh"];
  if (profile.port && profile.port !== 22) {
    parts.push("-p", String(profile.port));
  }
  if (profile.identityFile) {
    parts.push("-i", profile.identityFile);
  }
  if (profile.jumpHost) {
    parts.push("-J", profile.jumpHost);
  }
  const target = profile.user
    ? `${profile.user}@${profile.host}`
    : profile.host;
  parts.push(target);
  return parts.join(" ");
}
