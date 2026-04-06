import { Op } from 'sequelize';
import * as Yup from 'yup';
import bcrypt from 'bcrypt';

// Models
import UsersModel from '../models/UsersModel.js';

// Utils
import { ParseBoolean } from '../utils/parsers/ParseBoolean.js';
import { ParseDateRange } from '../utils/parsers/ParseDateRange.js';
import { BuildIncludes } from '../utils/sequeleze/BuildIncludes.js';

/**
 * Sanitiza usuário antes de retornar
 */
function sanitizeUser(user) {
  const { id, name, status, permissions_user_id, file_id } = user;
  return { id, name, status, permissions_user_id, file_id };
}

/**
 * Valida se ID é um número
 */
function validateId(id) {
  return !isNaN(Number(id));
}

class UsersController {
  // Listar usuários
  async index(req, res) {
    try {
      const {
        name,
        status,
        permissions_user_id,
        file_id,
        createdBefore,
        createdAfter,
        updatedBefore,
        updatedAfter,
        sort,
        page,
        limit,
        includelist,
      } = req.query;

      const where = {};
      if (name) where.name = { [Op.iLike]: `%${name}%` };
      if (status !== undefined) where.status = ParseBoolean(status);
      if (permissions_user_id)
        where.permissions_user_id = Number(permissions_user_id);
      if (file_id) where.file_id = Number(file_id);

      const createdRange = ParseDateRange(createdBefore, createdAfter);
      if (createdRange) where.createdAt = createdRange;

      const updatedRange = ParseDateRange(updatedBefore, updatedAfter);
      if (updatedRange) where.updatedAt = updatedRange;

      const order = [];
      const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'status'];
      if (sort) {
        const [field, direction] = sort.split(':');
        if (allowedSortFields.includes(field))
          order.push([
            field,
            direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
          ]);
      }

      const include = BuildIncludes(includelist);

      const pageNumber = Number(page) || 1;
      const pageSize = Math.min(Number(limit) || 10, 100);

      const { rows, count } = await UsersModel.findAndCountAll({
        attributes: { exclude: ['password_hash'] },
        where,
        include,
        order,
        distinct: true,
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
      });

      return res.json({
        data: rows.map(sanitizeUser),
        total: count,
        page: pageNumber,
        limit: pageSize,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  // Buscar usuário por ID
  async show(req, res) {
    try {
      const { id } = req.params;
      const { includelist } = req.query;

      if (!validateId(id))
        return res.status(400).json({ error: 'ID inválido' });

      const include = BuildIncludes(includelist);

      const user = await UsersModel.findByPk(id, {
        attributes: { exclude: ['password_hash'] },
        include,
      });

      if (!user)
        return res.status(404).json({ error: 'Usuário não encontrado' });

      return res.json(sanitizeUser(user));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  }

  // Criar usuário
  async create(req, res) {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().required(),
        password: Yup.string().required().min(8),
        status: Yup.boolean(),
        permissions_user_id: Yup.number().required(),
        file_id: Yup.number().nullable(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const password_hash = await bcrypt.hash(req.body.password, 8);

      const user = await UsersModel.create({
        name: req.body.name,
        password_hash,
        status: req.body.status ?? true,
        permissions_user_id: req.body.permissions_user_id
          ? Number(req.body.permissions_user_id)
          : null,
        file_id: req.body.file_id ? Number(req.body.file_id) : null
      });

      return res.status(201).json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof Yup.ValidationError)
        return res.status(400).json({ errors: error.errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  // Atualizar usuário
  async update(req, res) {
    try {
      const { id } = req.params;
      if (!validateId(id))
        return res.status(400).json({ error: 'ID inválido' });

      const user = await UsersModel.findByPk(id);
      if (!user)
        return res.status(404).json({ error: 'Usuário não encontrado' });

      const schema = Yup.object().shape({
        name: Yup.string(),
        status: Yup.boolean(),
        permissions_user_id: Yup.number(),
        file_id: Yup.number(),
        password: Yup.string().min(8),
      });

      await schema.validate(req.body, { abortEarly: false });

      const data = { ...req.body };
      if (req.body.password)
        data.password_hash = await bcrypt.hash(req.body.password, 8);
      delete data.password;

      await user.update(data);

      return res.json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof Yup.ValidationError)
        return res.status(400).json({ errors: error.errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  // Deletar usuário
  async destroy(req, res) {
    try {
      const { id } = req.params;
      if (!validateId(id))
        return res.status(400).json({ error: 'ID inválido' });

      const user = await UsersModel.findByPk(id);
      if (!user)
        return res.status(404).json({ error: 'Usuário não encontrado' });

      await user.destroy();
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
}

export default new UsersController();
