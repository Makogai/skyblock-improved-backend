import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user/user.entity';
import { AuthModule } from './auth/auth.module';
import { AblyModule } from './ably/ably.module';
import { ModModule } from './mod/mod.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'skyblock_admin',
      entities: [User],
      synchronize: true,
    }),
    AuthModule,
    AblyModule,
    ModModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
