import { ApiProperty } from '@nestjs/swagger';
import { CollectionItemKind } from '@prisma/client';
import { IsEnum, IsInt } from 'class-validator';

export class AddCollectionItemDto {
  @ApiProperty({ enum: CollectionItemKind })
  @IsEnum(CollectionItemKind)
  kind: CollectionItemKind;

  @ApiProperty({ example: 1 })
  @IsInt()
  entityId: number;
}
