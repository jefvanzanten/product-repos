interface iCategoryRepository {
  getCategories: () => Promise<CategoryData[]>;
}

class CategoryRepository implements iCategoryRepository {
  async getCategories(): Promise<CategoryData[]> {
    const categories = await db.select().from(category);
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
    }));
  }
}
