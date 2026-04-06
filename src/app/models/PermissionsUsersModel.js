import { Model, DataTypes } from 'sequelize';

class PermissionsUsersModel extends Model {
  static init(sequelize) {
    super.init(
      {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        permissions: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        status: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'permissions_users',
      }
    );
  }

  static associate(models) {
    // Associação 1:N com UsersModel
    this.hasMany(models.UsersModel, {
      foreignKey: 'permissions_user_id',
      as: 'user',
    });
  }
}

export default PermissionsUsersModel;
