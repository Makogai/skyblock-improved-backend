import { Module } from '@nestjs/common';
import { ModController } from './mod.controller';
import { ModService } from './mod.service';

@Module({
  controllers: [ModController],
  providers: [ModService],
})
export class ModModule {}
