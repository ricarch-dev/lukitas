export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly archived: boolean;
}
export interface CreateCategoryRequest {
  readonly name: string;
}
export interface UpdateCategoryRequest {
  readonly name: string;
}
