import fs from 'fs/promises';
import path from 'path';

/**
 * Deleta um arquivo físico com base no nome e updatedAt
 * @param {Object} file
 * @param {string} file.name
 * @param {Date|string} file.updatedAt
 */
export async function deleteFile(file) {
  try {

    if (!file?.path || !file?.updatedAt) {
      throw new Error('Dados insuficientes para deletar o arquivo');
    }

    const createdAt = new Date(file.updatedAt);
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');

    const dir = path.resolve('tmp', 'uploads', `${year}`, `${month}`);
    const fullPath = path.resolve(dir, file.path);

    // console.log(file)
    // console.log(fullPath)

    await fs.unlink(fullPath);

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(
        `Arquivo não encontrado no disco (já pode ter sido removido)`
      );
      return;
    }

    console.error('Erro ao deletar arquivo:', err);
    throw err; // opcional: propagar erro se quiser tratar fora
  }
}
