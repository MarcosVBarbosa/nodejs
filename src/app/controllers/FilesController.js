import FilesModel from '../models/FilesModel.js';

//Utils
import { DeleteFile } from '../utils/file/DeleteFile.js';

class FilesController {
  /**
   * @swagger
   * /files:
   *   get:
   *     summary: Lista arquivos
   *     tags: [Files]
   *     parameters:
   *       - in: query
   *         name: name
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: ["true", "false"]
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           example: name:ASC
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *           maximum: 100
   */
  async index(req, res) {
    try {
      const { name, status, sort, page, limit } = req.query;
      const where = {};

      if (name) where.name = { [FilesModel.sequelize.Op.iLike]: `%${name}%` };
      if (status !== undefined)
        where.status = ['true', '1', 'yes'].includes(
          String(status).toLowerCase()
        );

      const order = [];
      if (sort) {
        const [field, direction] = sort.split(':');
        const allowedFields = ['name', 'createdAt', 'updatedAt', 'status'];
        if (allowedFields.includes(field)) {
          order.push([
            field,
            direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
          ]);
        }
      }

      const pageNumber = Number(page) || 1;
      const pageSize = Math.min(Number(limit) || 10, 100);

      const { rows, count } = await FilesModel.findAndCountAll({
        where,
        order,
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
      });

      return res.json({
        data: rows,
        total: count,
        page: pageNumber,
        limit: pageSize,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
  }

  /**
   * @swagger
   * /files/{id}:
   *   get:
   *     summary: Buscar arquivo por ID
   *     tags: [Files]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Arquivo encontrado
   *       404:
   *         description: Arquivo não encontrado
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(Number(id)))
        return res.status(400).json({ error: 'ID inválido' });

      const file = await FilesModel.findByPk(id);
      if (!file)
        return res.status(404).json({ error: 'Arquivo não encontrado' });

      return res.json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar arquivo' });
    }
  }

  /**
   * @swagger
   * /files:
   *   post:
   *     summary: Criar/Enviar arquivo
   *     tags: [Files]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   */
  async create(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      const file = await FilesModel.create({
        name: req.file.originalname,
        path: req.file.filename,
        status: true,
      });

      return res.status(201).json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar arquivo' });
    }
  }

  /**
   * @swagger
   * /files/{id}:
   *   put:
   *     summary: Atualizar arquivo
   *     tags: [Files]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               status:
   *                 type: boolean
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(Number(id)))
        return res.status(400).json({ error: 'ID inválido' });

      const file = await FilesModel.findByPk(id);
      if (!file)
        return res.status(404).json({ error: 'Arquivo não encontrado' });

      const { name, status } = req.body;
      if (name !== undefined) file.name = name;
      if (status !== undefined) file.status = status;

      await file.save();
      return res.json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar arquivo' });
    }
  }

  /**
   * @swagger
   * /files/{id}:
   *   delete:
   *     summary: Deletar arquivo
   *     description: >
   *       Remove o registro do arquivo no banco de dados e, após sucesso,
   *       tenta deletar o arquivo físico do disco com base no nome e na data de criação (created_at).
   *       Caso o arquivo físico não exista, a operação não falha.
   *     tags: [Files]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID do arquivo a ser deletado
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Arquivo deletado com sucesso (sem conteúdo)
   *       404:
   *         description: Arquivo não encontrado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Arquivo não encontrado
   *       500:
   *         description: Erro interno ao deletar arquivo
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Erro ao deletar arquivo
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const file = await FilesModel.findByPk(id);

      if (!file)
        return res.status(404).json({ error: 'Arquivo não encontrado' });

      // Deleta do banco primeiro
      await file.destroy();

      // Depois tenta deletar o arquivo físico
      await DeleteFile(file);

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar arquivo' });
    }
  }
}

export default new FilesController();
