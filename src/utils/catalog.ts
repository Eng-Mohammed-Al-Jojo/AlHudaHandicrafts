import type { Category, Product } from '../types'

export function getPublicCategories(categories: Category[], products: Product[]): Category[] {
  const categoryIdsWithPublishedProducts = new Set(
    products.filter(product => product.isPublished).map(product => product.categoryId)
  )

  return categories
    .filter(category => category.isVisible && categoryIdsWithPublishedProducts.has(category.id))
    .sort((a, b) => a.order - b.order)
}

export function hasPublishedProducts(categoryId: string, products: Product[]): boolean {
  return products.some(product => product.categoryId === categoryId && product.isPublished)
}
