import 'dotenv/config';
import { resolve } from 'path';

const getVaultPath = (): string => {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    console.error('Error: VAULT_PATH is not set. Add it to your .env file.');
    process.exit(1);
  }
  return resolve(vaultPath);
};

export const config = {
  vaultPath: getVaultPath(),
};
