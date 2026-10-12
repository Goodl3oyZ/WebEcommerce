/**
 * Parse ?page=&limit= into safe integers. Limits are clamped so a client
 * cannot request an unbounded page.
 */
export function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export const paginationMeta = (total, { page, limit }) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
});
