import { useSearchParams } from 'react-router-dom'
import HeroBanner from '../components/store/HeroBanner'
import TrustFeatures from '../components/store/TrustFeatures'
import CategoryGrid from '../components/store/CategoryGrid'
import ProductGrid from '../components/store/ProductGrid'
import StorySection from '../components/store/StorySection'
import Newsletter from '../components/store/Newsletter'
import type { Product, Category, SiteSettings } from '../types'

interface Props {
  products: Product[]
  categories: Category[]
  onAddToCart: (p: Product) => void
  settings: SiteSettings
}

export default function StorePage({ products, categories, onAddToCart, settings }: Props) {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''

  return (
    <div className="animate-fade-in">
      <HeroBanner />
      <TrustFeatures freeShippingThreshold={settings.freeShippingThreshold} />
      <CategoryGrid categories={categories} />
      <ProductGrid
        products={products}
        categories={categories}
        initialQuery={query}
        onAddToCart={onAddToCart}
        heading="قطع مميزة ومختارة"
        subheading="إصدارات تتحدث بالفخامة"
        featured={true}
      />
      <StorySection />
      <Newsletter />
    </div>
  )
}
