import { IsNotEmpty, IsString } from 'class-validator';

export class SendItemsToKitchenDto {
    @IsNotEmpty()
    @IsString()
    orderId: string;
}
