import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PqrsModule } from './modules/pqrs/pqrs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    VerificationModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    PqrsModule,
    NotificationsModule,
    MediaModule,
    ChatModule,
    AdminModule,
  ],
})
export class AppModule {}
