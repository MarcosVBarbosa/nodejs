import { Op } from 'sequelize';
import * as Yup from 'yup';

//Models
import PermissionsUsersModel from '../models/PermissionsUsersModel.js';

// Utils
import { ParseBoolean } from '../utils/parsers/ParseBoolean.js';
import { ParseDateRange } from '../utils/parsers/ParseDateRange.js';

class PermissionsUsersController {
  async index(req, res) {
    try {
      const {
        name,
        description,
        status,
        createdBefore,
        createdAfter,
        updatedBefore,
        updatedAfter,
        sort,
        page,
        limit,
      } = req.query;

      const where = {};
      if (name) where.name = { [Op.iLike]: `%${name}%` };
      if (description) where.description = { [Op.iLike]: `%${description}%` };
      if (status !== undefined) where.status = ParseBoolean(status);

      const createdRange = ParseDateRange(createdBefore, createdAfter);
      if (createdRange) where.createdAt = createdRange;

      const updatedRange = ParseDateRange(updatedBefore, updatedAfter);
      if (updatedRange) where.updatedAt = updatedRange;

      const allowedSortFields = [
        'name',
        'description',
        'createdAt',
        'updatedAt',
        'status',
      ];
      const order = [];
      if (sort) {
        const [field, direction] = sort.split(':');
        if (allowedSortFields.includes(field))
          order.push([
            field,
            direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
          ]);
      }

      const pageNumber = Number(page) || 1;
      const pageSize = Math.min(Number(limit) || 10, 100);

      const { rows, count } = await PermissionsUsersModel.findAndCountAll({
        where,
        order,
        distinct: true,
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
      return res.status(500).json({ error: 'Erro ao listar permissões' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(Number(id)))
        return res.status(400).json({ error: 'ID inválido' });

      const data = await PermissionsUsersModel.findByPk(id);
      if (!data)
        return res.status(404).json({ error: 'Permissão não encontrada' });

      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar permissão' });
    }
  }

  async create(req, res) {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().required(),
        description: Yup.string().required(),
        status: Yup.boolean(),
        permissions: Yup.object().required(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const { name, description, permissions, status } = req.body;

      const data = await PermissionsUsersModel.create({
        name,
        description,
        permissions,
        status: status ?? true,
      });

      return res.status(201).json(data);
    } catch (error) {
      if (error instanceof Yup.ValidationError)
        return res.status(400).json({ errors: error.errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar permissão' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(Number(id)))
        return res.status(400).json({ error: 'ID inválido' });

      const data = await PermissionsUsersModel.findByPk(id);
      if (!data)
        return res.status(404).json({ error: 'Permissão não encontrada' });

      const schema = Yup.object().shape({
        name: Yup.string(),
        description: Yup.string(),
        status: Yup.boolean(),
        permissions: Yup.object(),
      });

      await schema.validate(req.body, { abortEarly: false });

      await data.update({ ...req.body });
      return res.json(data);
    } catch (error) {
      if (error instanceof Yup.ValidationError)
        return res.status(400).json({ errors: error.errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar permissão' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(Number(id)))
        return res.status(400).json({ error: 'ID inválido' });

      const data = await PermissionsUsersModel.findByPk(id);
      if (!data)
        return res.status(404).json({ error: 'Permissão não encontrada' });

      await data.destroy();
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar permissão' });
    }
  }
}

export default new PermissionsUsersController();
