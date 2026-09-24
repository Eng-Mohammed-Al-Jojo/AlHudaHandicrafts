import { Sparkles, Gift, Truck, Headphones } from 'lucide-react'
import { useCurrency } from '../../context/CurrencyContext'
import { getFreeShippingThreshold } from '../../utils/commerce'

interface Props {
  freeShippingThreshold?: number
}

export default function TrustFeatures({ freeShippingThreshold = 350 }: Props) {
  const threshold = getFreeShippingThreshold(freeShippingThreshold)
  const { formatPrice } = useCurrency()
  const features = [
    {
      icon: Sparkles,
      title: 'تطريز يدوي متقن',
      desc: 'حرفية أصيلة بخيوط حريرية وذهبية فاخرة',
    },
    {
      icon: Gift,
      title: 'تغليف إهداء راقٍ',
      desc: 'علب وبطاقات فاخرة تليق بأغلى مناسباتكِ',
    },
    {
      icon: Truck,
      title: 'شحن سريع وموثوق',
      desc: threshold > 0 
        ? `شحن مجاني للطلبات فوق ${formatPrice(threshold)} لكافة المناطق`
        : 'شحن مجاني لكافة الطلبات لجميع المناطق',
    },
    {
      icon: Headphones,
      title: 'تواصل ودعم مباشر',
      desc: 'استشارات وتنسيق المقاسات والتطريز عبر واتساب',
    },
  ]

  return (
    <section className="border-y border-[#EADBCE] bg-[#FAF7F2]/60 py-10">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/70 border border-[#EADBCE]/70 hover:border-[#C59B4B]/60 hover:bg-white hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#F7F1E5] flex items-center justify-center text-[#8D6527] group-hover:bg-[#C59B4B] group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Icon className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#221811] m-0 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#685D52] m-0 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
