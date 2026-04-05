import { Model, DataTypes } from 'sequelize';

class FilesModel extends Model {
  static init(sequelize) {
    super.init(
      {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        path: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'files',
      }
    );
  }

  static associate(models) {
    this.hasMany(models.UsersModel, {
      foreignKey: 'file_id',
      as: 'users',
    });
  }
}

export default FilesModel;