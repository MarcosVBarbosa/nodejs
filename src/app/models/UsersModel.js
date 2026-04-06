import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

class UsersModel extends Model {
  static init(sequelize) {
    super.init(
      {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        permissions_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        file_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'users',
        defaultScope: {
          attributes: { exclude: ['password_hash'] },
        },
        scopes: {
          withPassword: {
            attributes: { include: ['password_hash'] },
          },
        },
      }
    );
  }

  static associate(models) {
    // Associação com PermissionsUsersModel (1 usuário pertence a 1 permissão)
    this.belongsTo(models.PermissionsUsersModel, {
      foreignKey: 'permissions_user_id',
      as: 'permissionUser',
    });

    // Associação com FilesModel (1 usuário pertence a 1 arquivo)
    this.belongsTo(models.FilesModel, {
      foreignKey: 'file_id',
      as: 'file',
    });
  }

  // Método para comparar senha
  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

export default UsersModel;
