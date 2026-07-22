require('dotenv').config();
const pool = require('../shared/config/db');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['soporte_tecnico', 'accesos_permisos', 'hardware', 'software', 'otro'];
const TERMINAL_STATUSES = ['resolved', 'closed'];
const SLA_HOURS = { urgent: 4, high: 24, medium: 48, low: 72 };
const TOTAL_REQUESTS = 280;

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomPastDate = (daysAgoMax) => {
  const now = Date.now();
  const past = now - randomInt(0, daysAgoMax) * 24 * 60 * 60 * 1000;
  return new Date(past);
};

async function run() {
  const client = await pool.connect();

  try {
    const usersResult = await client.query('SELECT id, name FROM users');
    const users = usersResult.rows;

    if (users.length < 2) {
      throw new Error('Se necesitan al menos 2 usuarios para generar datos de demo.');
    }

    const adminsResult = await client.query(
      `SELECT u.id, u.name FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'admin'`
    );
    const admins = adminsResult.rows;

    if (admins.length === 0) {
      throw new Error('Se necesita al menos un usuario admin para asignar solicitudes.');
    }

    console.log(`Generando ${TOTAL_REQUESTS} solicitudes de demo (${users.length} usuarios, ${admins.length} agente(s))...`);

    let created = 0;

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const owner = randomFrom(users);
      const priority = randomFrom(PRIORITIES);
      const category = randomFrom(CATEGORIES);
      const createdAt = randomPastDate(180);

      const outcome = Math.random();
      let status;
      let resolvedAt = null;
      let closedAt = null;
      let assignedTo = null;

      if (outcome < 0.10) {
        // 10% rechazadas
        status = 'rejected';
        assignedTo = randomFrom(admins).id;
      } else if (outcome < 0.80) {
        // 70% resueltas o cerradas
        status = randomFrom(TERMINAL_STATUSES);
        assignedTo = randomFrom(admins).id;

        const slaHours = SLA_HOURS[priority];
        const withinSla = Math.random() < 0.65;
        const resolutionHours = withinSla
          ? randomInt(1, Math.max(1, slaHours - 1))
          : randomInt(slaHours + 1, slaHours * 3);

        resolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
        closedAt = status === 'closed'
          ? new Date(resolvedAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000)
          : null;
      } else {
        // 20% siguen activas
        status = randomFrom(['open', 'in_progress', 'waiting_user']);
        assignedTo = status === 'open' ? null : randomFrom(admins).id;
      }

      const result = await client.query(
        `INSERT INTO requests
           (title, description, status, priority, category, user_id, assigned_to, created_at, updated_at, resolved_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
         RETURNING id`,
        [
          `Solicitud de demo #${i + 1}`,
          `Descripción generada automáticamente para pruebas de analítica (${category}).`,
          status,
          priority,
          category,
          owner.id,
          assignedTo,
          createdAt,
          resolvedAt,
          closedAt,
        ]
      );

      const requestId = result.rows[0].id;

      if (assignedTo) {
        const responseHours = randomInt(1, 24);
        const respondedAt = new Date(createdAt.getTime() + responseHours * 60 * 60 * 1000);

        await client.query(
          `INSERT INTO request_history (request_id, changed_by, field, old_value, new_value, description, created_at)
           VALUES ($1, $2, 'status', 'open', 'in_progress', 'Solicitud tomada por el agente', $3)`,
          [requestId, assignedTo, respondedAt]
        );
      }

      created++;
    }

    console.log(`✅ ${created} solicitudes de demo creadas.`);
    process.exit();
  } catch (error) {
    console.error('Error generando datos de demo:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
