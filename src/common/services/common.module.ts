/* eslint-disable prettier/prettier */
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../redis/redis.module';
import { CacheService } from '../services/cache.service';

@Global()
@Module({
    imports: [
        ConfigModule,
        RedisModule,
    ],
    providers: [
        CacheService,
    ],
    exports: [
        CacheService,
    ],
})
export class CommonModule {}