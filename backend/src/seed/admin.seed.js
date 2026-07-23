require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../shared/config/db');

// Permisos base por rol del sistema
const ROLE_PERMISSIONS = {
  admin: null, // null = todos los is_protected
  admin_system: null, // null = todos los is_protected (mismo conjunto que admin)
  user: ['requests_create', 'requests_read'],
  agente: ['requests_manage_assigned']
};

async function seedSystemRoles(client) {
  const roles = [
    { name: 'admin', description: 'Administrador del sistema' },
    { name: 'admin_system', description: 'Administrador del sistema (equivalente a admin, sin protección especial de cuenta)' },
    { name: 'user',  description: 'Usuario estándar del sistema' },
    { name: 'agente', description: 'Empleado de soporte: ve y gestiona solo los tickets que tiene asignados' }
  ];

  const roleIds = {};

  for (const role of roles) {
    await client.query(
      `INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [role.name, role.description]
    );

    const result = await client.query(
      `SELECT id FROM roles WHERE name = $1`,
      [role.name]
    );

    roleIds[role.name] = result.rows[0].id;
  }

  return roleIds;
}

async function assignRolePermissions(client, roleId, roleName) {
  let permsResult;

  if (ROLE_PERMISSIONS[roleName] === null) {
    // admin → todos los permisos protegidos
    permsResult = await client.query(
      `SELECT id FROM permissions WHERE is_protected = TRUE`
    );
  } else {
    // user → solo los permisos definidos
    permsResult = await client.query(
      `SELECT id FROM permissions WHERE name = ANY($1)`,
      [ROLE_PERMISSIONS[roleName]]
    );
  }

  for (const { id: permId } of permsResult.rows) {
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [roleId, permId]
    );
  }

  console.log(`✅ ${permsResult.rows.length} permisos asignados al rol "${roleName}"`);
}

const COMPANY_AREAS = [
  ['Service Desk IT', 'Área encargada de la gestión de tickets de soporte'],
  ['Recursos Humanos', 'Gestión de personal, nómina, contratación y bienestar laboral'],
  ['Finanzas', 'Contabilidad, tesorería y planificación financiera'],
  ['Marketing', 'Gestión de marca, campañas y comunicación'],
  ['Ventas', 'Gestión comercial y relación con clientes'],
  ['Legal', 'Asuntos jurídicos, contratos y cumplimiento normativo'],
  ['Operaciones', 'Gestión de procesos y logística interna'],
  ['Atención al Cliente', 'Soporte y seguimiento a clientes externos'],
  ['Infraestructura TI', 'Redes, servidores y sistemas internos'],
];

async function seedAreas(client) {
  for (const [nombre, descripcion] of COMPANY_AREAS) {
    await client.query(
      `INSERT INTO areas (nombre, descripcion)
       VALUES ($1, $2)
       ON CONFLICT (nombre) DO NOTHING`,
      [nombre, descripcion]
    );
  }
}

async function createAdmin(client, adminRoleId) {
  const email = 'admin@empresa.com';

  const exists = await client.query(
    `SELECT id FROM users WHERE email = $1`, [email]
  );

  let userId;

  if (exists.rows.length > 0) {
    userId = exists.rows[0].id;
    console.log('⚠️  Usuario admin ya existe — verificando rol...');
  } else {
    const hashedPassword = await bcrypt.hash('Admin123*', 10);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Super Admin', email, hashedPassword]
    );

    userId = userResult.rows[0].id;
    console.log('✅ Usuario admin creado');
  }

  await client.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, adminRoleId]
  );

  console.log('✅ Rol admin asignado al usuario');
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Crear roles del sistema
    const roleIds = await seedSystemRoles(client);

    // 1.5️⃣ Crear áreas del sistema
    await seedAreas(client);

    // 2️⃣ Asignar permisos a cada rol
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      await assignRolePermissions(client, roleIds[roleName], roleName);
    }

    // 3️⃣ Crear usuario admin
    await createAdmin(client, roleIds['admin']);

    await client.query('COMMIT');
    console.log('\n✅ Setup completado');
    process.exit();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();