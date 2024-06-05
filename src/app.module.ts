import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ListnerModule } from './modules/listner/listner.module';
import { OffloadModule } from './generated/Offload/offload.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ERC20_ABIModule } from './generated/ERC20_ABI/erc20_abi.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongo-url'),
    // ListnerModule,
    ERC20_ABIModule,
    OffloadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
