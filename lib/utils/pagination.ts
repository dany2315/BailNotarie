export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "10"),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    search: searchParams.get("search") || undefined,
  };
}

export function getPaginationSkip(params: PaginationParams): number {
  return (params.page || 1 - 1) * (params.pageSize || 10);
}

export function getPaginationTake(params: PaginationParams): number {
  return params.pageSize || 10;
}


