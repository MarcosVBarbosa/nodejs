import jwt from 'jsonwebtoken';
import * as Yup from 'yup';
import crypto from 'crypto';
import dayjs from 'dayjs';

// Models
import UsersModel from '../models/UsersModel.js';
import RefreshTokenModel from '../models/RefreshTokenModel.js';

// Config
import authConfig from '../../config/auth.js';

// Security
import {
  isBlocked,
  registerFail,
  resetAttempts,
} from '../utils/security/loginAttempts.js';

class SessionsController {
  // 🔐 LOGIN
  async create(req, res) {
    try {
      const schema = Yup.object().shape({
        username: Yup.string().required(),
        password: Yup.string().required(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const { username, password } = req.body;
      const normalizedUsername = username.toLowerCase();

      if (isBlocked(normalizedUsername)) {
        return res.status(429).json({
          error: 'Usuário bloqueado temporariamente',
        });
      }

      const user = await UsersModel.scope('withPassword').findOne({
        where: { username: normalizedUsername },
        include: ['roles'],
      });

      if (!user || !(await user.checkPassword(password))) {
        registerFail(normalizedUsername);
        await new Promise((r) => setTimeout(r, 300));

        if (!user.status) {
          return res.status(401).json({
            error: 'Usuário ou senha inválidos ou usuário inativo',
          });
        }
      }

      if (!user.status) {
        if (!user.status) {
          return res.status(401).json({
            error: 'Usuário ou senha inválidos ou usuário inativo',
          });
        }
      }

      resetAttempts(normalizedUsername);

      // 🔐 ACCESS TOKEN
      const accessToken = jwt.sign({ id: user.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      // 🔁 REFRESH TOKEN
      const refreshToken = crypto.randomBytes(40).toString('hex');

      const expiresAt = dayjs()
        .add(authConfig.refreshExpiresIn || 7, 'day')
        .toDate();

      await RefreshTokenModel.create({
        refresh_token: refreshToken,
        user_id: user.id,
        expires_at: expiresAt,
      });

      // 🍪 salva em cookie httpOnly
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true, // obrigatório (HTTPS)
        sameSite: 'none', // ✅ ESSENCIAL
        path: '/', // recomendado
      });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.roles.crud,
          file_id: user.file_id,
          status: user.status,
        },
        access_token: accessToken,
      });
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        return res.status(400).json({ errors: error.errors });
      }

      console.error(error);
      return res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }

  // 🔁 REFRESH (ROTATION)
  async refresh(req, res) {
    try {
      const refresh_token = req.cookies.refresh_token;

      if (!refresh_token) {
        return res.status(401).json({ error: 'Refresh token não enviado' });
      }

      const storedToken = await RefreshTokenModel.findOne({
        where: { refresh_token },
        include: ['user'],
      });

      if (!storedToken) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // 🚨 DETECÇÃO DE REUSE (ATAQUE)
      if (storedToken.revoked_at) {
        await RefreshTokenModel.update(
          { revoked_at: new Date() },
          {
            where: {
              user_id: storedToken.user_id,
              revoked_at: null,
            },
          }
        );

        return res.status(401).json({
          error: 'Sessão comprometida. Faça login novamente.',
        });
      }

      // ⏳ EXPIRADO
      if (storedToken.expires_at < new Date()) {
        return res.status(401).json({ error: 'Token expirado' });
      }

      const user = storedToken.user;

      if (!user || !user.status) {
        return res.status(401).json({ error: 'Usuário inválido' });
      }

      // 🔥 ROTATION (revoga antigo)
      storedToken.revoked_at = new Date();
      await storedToken.save();

      // 🔁 novo refresh
      const newRefreshToken = crypto.randomBytes(40).toString('hex');

      const expiresAt = dayjs()
        .add(authConfig.refreshExpiresIn || 7, 'day')
        .toDate();

      await RefreshTokenModel.create({
        refresh_token: newRefreshToken,
        user_id: user.id,
        expires_at: expiresAt,
      });

      // 🔐 novo access token
      const accessToken = jwt.sign({ id: user.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      // 🍪 atualiza cookie
      // res.cookie('refresh_token', newRefreshToken, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: 'strict',
      // });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: true, // obrigatório (HTTPS)
        sameSite: 'none', // ✅ ESSENCIAL
        path: '/', // recomendado
      });

      return res.json({
        access_token: accessToken,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao renovar token' });
    }
  }

  // 🚪 LOGOUT
  async logout(req, res) {
    try {
      const refresh_token = req.cookies.refresh_token;

      if (refresh_token) {
        const storedToken = await RefreshTokenModel.findOne({
          where: { refresh_token },
        });

        if (storedToken) {
          storedToken.revoked_at = new Date();
          await storedToken.save();
        }
      }

      // limpa cookie
      res.clearCookie('refresh_token');

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao realizar logout' });
    }
  }
}

export default new SessionsController();
