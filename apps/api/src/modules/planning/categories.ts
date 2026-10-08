import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { IdempotencyService } from '../../common/idempotency.js';
import { AppError, notFound } from '../../common/errors.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { record } from '../../common/request-input.js';
import {
  dtoCategory,
  normalizeName,
  normalizedName,
  now,
} from './planning-support.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  async list(userId: string, includeArchived = false) {
    const categories = await this.prisma.category.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { name: 'asc' },
    });
    return categories.map(dtoCategory);
  }

  async create(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const name = normalizeName(input.name);
    const normalized = normalizedName(name);
    const existing = await this.prisma.category.findFirst({
      where: { userId, normalizedName: normalized },
    });
    if (existing) throw new AppError('CONFLICT', 'Category name already exists', 409);
    const category = await this.prisma.category.create({
      data: { userId, name, normalizedName: normalized },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_CREATED', targetId: category.id },
    });
    const result = dtoCategory(category);
    await this.idem.save(userId, key, body, result);
    return result;
  }

  async rename(userId: string, id: string, body: unknown) {
    const category = await this.find(userId, id);
    const name = normalizeName(record(body).name);
    const normalized = normalizedName(name);
    const duplicate = await this.prisma.category.findFirst({
      where: { userId, normalizedName: normalized, NOT: { id } },
    });
    if (duplicate) throw new AppError('CONFLICT', 'Category name already exists', 409);
    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: { name, normalizedName: normalized },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_RENAMED', targetId: id },
    });
    return dtoCategory(updated);
  }

  async archive(userId: string, id: string, key?: string) {
    const body = { id };
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    await this.find(userId, id);
    const updated = await this.prisma.category.update({
      where: { id },
      data: { archivedAt: now() },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_ARCHIVED', targetId: id },
    });
    const result = dtoCategory(updated);
    await this.idem.save(userId, key, body, result);
    return result;
  }

  private async find(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) notFound('Category not found');
    return category;
  }
}

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('includeArchived') archived?: string) {
    return this.categories.list(req.user.sub, archived === 'true');
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.categories.create(req.user.sub, key, body);
  }

  @Patch(':id')
  rename(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.categories.rename(req.user.sub, id, body);
  }

  @Post(':id/archive')
  archive(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return this.categories.archive(req.user.sub, id, key);
  }
}
