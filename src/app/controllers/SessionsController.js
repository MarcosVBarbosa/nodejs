import jwt from 'jsonwebtoken';
import * as Yup from 'yup';

// Models
import UsersModel from '../models/UsersModel.js';

// Config
import authConfig from '../../config/auth.js';

// Security
import {
  isBlocked,
  registerFail,
  resetAttempts,
} from '../utils/security/loginAttempts.js';

class SessionsController {
  /**
   * @swagger
   * /sessions:
   *   post:
   *     summary: Login do usuário
   *     tags: [Auth]
   *     description: |
   *       Endpoint responsável por autenticação.
   *
   *       🔒 Proteção contra força bruta:
   *       - Após 5 tentativas inválidas, o usuário é bloqueado por 15 minutos.
   *       - O bloqueio é baseado no "name" (usuário), não no IP.
   *       - Após login bem-sucedido, o contador é resetado.
   *
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *                 example: admin
   *               password:
   *                 type: string
   *                 example: 12345678
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                     name:
   *                       type: string
   *                     status:
   *                       type: boolean
   *                 token:
   *                   type: string
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Usuário ou senha inválidos
   *       429:
   *         description: Usuário bloqueado por excesso de tentativas
   */
  async create(req, res) {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().required(),
        password: Yup.string().required(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const { name, password } = req.body;

      // 🚫 bloqueio por usuário
      if (isBlocked(name)) {
        return res.status(429).json({
          error: 'Usuário bloqueado temporariamente por excesso de tentativas',
        });
      }

      const user = await UsersModel.scope('withPassword').findOne({
        where: { name },
      });

      if (!user || !(await user.checkPassword(password))) {
        registerFail(name);

        // delay opcional anti brute force
        await new Promise((r) => setTimeout(r, 300));

        return res.status(401).json({
          error: 'Usuário ou senha inválidos',
        });
      }

      // ✅ sucesso → limpa tentativas
      resetAttempts(name);

      const token = jwt.sign({ id: user.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          status: user.status,
        },
        token,
      });
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        return res.status(400).json({ errors: error.errors });
      }

      console.error(error);
      return res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }
}

export default new SessionsController();
