export interface SshProfile {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  identityFile?: string;
  jumpHost?: string;
}
