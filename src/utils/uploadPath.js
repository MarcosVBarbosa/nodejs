import fs from 'fs';
import { resolve } from 'path';

// Função para criar diretório baseado no ano/mês
export function getUploadPath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 0-indexed

  const dir = resolve('tmp', 'uploads', `${year}`, `${month}`);

  // Cria diretórios recursivamente, se não existirem
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}
