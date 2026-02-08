import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user/user.entity';

async function seed() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skyblock_admin',
    entities: [User],
    synchronize: true,
  });
  await ds.initialize();

  const repo = ds.getRepository(User);
  const existing = await repo.findOne({ where: { email: 'admin@skyblock.local' } });
  if (existing) {
    console.log('Admin user already exists');
    await ds.destroy();
    return;
  }

  const hash = await bcrypt.hash('admin123', 10);
  await repo.save({
    email: 'admin@skyblock.local',
    passwordHash: hash,
    role: UserRole.ADMIN,
  });
  console.log('Created admin user: admin@skyblock.local / admin123');
  await ds.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
