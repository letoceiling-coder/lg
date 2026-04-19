import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryListingsDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) region_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() kind?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ description: 'Comma-separated listing statuses (e.g. ACTIVE,RESERVED,SOLD)' })
  @IsOptional()
  @IsString()
  statuses?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() data_source?: string;
  @ApiPropertyOptional({ description: 'Filter by isPublished (true/false). Default: true for anonymous, no filter for admin.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  is_published?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) price_min?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) price_max?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) area_total_min?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) area_total_max?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) area_kitchen_min?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) area_kitchen_max?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) floor_min?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) floor_max?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') not_first_floor?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') not_last_floor?: boolean;

  @ApiPropertyOptional({ description: 'Comma-separated room type IDs' }) @IsOptional() @IsString() rooms?: string;
  @ApiPropertyOptional({ description: 'Comma-separated finishing IDs' }) @IsOptional() @IsString() finishing?: string;
  @ApiPropertyOptional({ description: 'Comma-separated building type IDs' }) @IsOptional() @IsString() building_type?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) block_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) builder_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) district_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) subway_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sort?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) per_page?: number = 20;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) geo_lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) geo_lng?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(200_000) @Type(() => Number) geo_radius_m?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() geo_polygon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() geo_preset?: string;
}
