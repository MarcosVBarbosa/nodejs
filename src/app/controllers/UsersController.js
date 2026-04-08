import { Op } from 'sequelize';
import * as Yup from 'yup';
import bcrypt from 'bcrypt';

// Models
import UsersModel from '../models/UsersModel.js';

// Utils
import { ParseBoolean } from '../utils/parsers/ParseBoolean.js';
import { ParseDateRange } from '../utils/parsers/ParseDateRange.js';
import { BuildIncludes } from '../utils/sequelize/BuildIncludes.js';

/**
 * Sanitiza usuário antes de retornar
 */
/**
 * Sanitiza usuário antes de retornar
 */
function sanitizeUser(user) {
  // Se for instância do Sequelize, pega os dados
  const rawUser = user.toJSON ? user.toJSON() : user;

  // Monta o objeto base
  const result = {
    id: rawUser.id,
    name: rawUser.name,
    username: rawUser.username,
    status: rawUser.status,
    role_id: rawUser.role_id,
    file_id: rawUser.file_id,
    created_at: rawUser.created_at,
    updated_at: rawUser.updated_at,
  };

  // Adiciona roles se existir (vem do include)
  if (rawUser.roles) {
    result.roles = {
      id: rawUser.roles.id,
      name: rawUser.roles.name,
      permissions: rawUser.roles.permissions,
      description: rawUser.roles.description,
      status: rawUser.roles.status,
    };
  }

  // Adiciona file se existir (vem do include)
  if (rawUser.file) {
    result.file = {
      id: rawUser.file.id,
      name: rawUser.file.name,
      path: rawUser.file.path,
      url: rawUser.file.url,
    };
  }

  return result;
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
        username,
        status,
        role_id,
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
      if (username)
        where.username = { [Op.iLike]: `%${username.toLowerCase()}%` };
      if (status !== undefined) where.status = ParseBoolean(status);
      if (role_id) where.role_id = Number(role_id);
      if (file_id) where.file_id = Number(file_id);

      const createdRange = ParseDateRange(createdBefore, createdAfter);
      if (createdRange) where.created_at = createdRange;

      const updatedRange = ParseDateRange(updatedBefore, updatedAfter);
      if (updatedRange) where.updated_at = updatedRange;

      const order = [];
      const allowedSortFields = [
        'name',
        'username',
        'created_at',
        'updated_at',
        'status',
      ];

      if (sort) {
        const [field, direction] = sort.split(':');
        if (allowedSortFields.includes(field)) {
          order.push([
            field,
            direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
          ]);
        }
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
      return res
        .status(500)
        .json({ error: 'Erro ao listar usuários', err: error });
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
        username: Yup.string().required(),
        password: Yup.string().required().min(8),
        status: Yup.boolean(),
        role_id: Yup.number().required(),
        file_id: Yup.number().nullable(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const username = req.body.username.toLowerCase();

      const userExists = await UsersModel.findOne({
        where: { username },
      });

      if (userExists) {
        return res.status(400).json({ error: 'Username já existe' });
      }

      const password_hash = await bcrypt.hash(req.body.password, 8);

      const user = await UsersModel.create({
        name: req.body.name,
        username,
        password_hash,
        status: req.body.status ?? true,
        role_id: Number(req.body.role_id),
        file_id: req.body.file_id ? Number(req.body.file_id) : null,
      });

      return res.status(201).json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        return res.status(400).json({ errors: error.errors });
      }

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
        username: Yup.string(),
        status: Yup.boolean(),
        role_id: Yup.number(),
        file_id: Yup.number(),
        password: Yup.string().min(8),
      });

      await schema.validate(req.body, { abortEarly: false });

      const data = { ...req.body };

      if (data.username) {
        data.username = data.username.toLowerCase();

        const userExists = await UsersModel.findOne({
          where: {
            username: data.username,
            id: { [Op.ne]: id },
          },
        });

        if (userExists) {
          return res.status(400).json({ error: 'Username já existe' });
        }
      }

      if (data.password) {
        data.password_hash = await bcrypt.hash(data.password, 8);
        delete data.password;
      }

      await user.update(data);

      return res.json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        return res.status(400).json({ errors: error.errors });
      }

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
