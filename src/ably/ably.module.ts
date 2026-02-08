import { Global, Module } from '@nestjs/common';
import { AblyController } from './ably.controller';
import { AblyService } from './ably.service';

@Global()
@Module({
  controllers: [AblyController],
  providers: [AblyService],
  exports: [AblyService],
})
export class AblyModule {}
