import RolesModel from '../../models/RolesModel.js';
import FilesModel from '../../models/FilesModel.js';

export function BuildIncludes(includelist) {
  if (!includelist) {
    return [];
  }

  const includeOptions = {
    role: {
      model: RolesModel,
      as: 'roles',
      attributes: ['id', 'name', 'permissions', 'description', 'status'],
      required: false,
    },
    file: {
      model: FilesModel,
      as: 'file',
      attributes: ['id', 'name', 'path', 'url'],
      required: false,
    },
  };

  const include = [];
  const items = includelist.split(',').map((item) => item.trim().toLowerCase());

  items.forEach((key) => {
    if (includeOptions[key]) {
      include.push(includeOptions[key]);
    }
  });

  return include;
}
