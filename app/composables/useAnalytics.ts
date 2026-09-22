import { useGtag } from '#imports'

export const useAnalytics = () => {
  const { gtag } = useGtag()

  const trackViewItem = (item: { id: string; name: string; price: number; currency?: string; brand?: string; category?: string }) => {
    const currency = item.currency || 'OMR'
    
    // GA4
    gtag('event', 'view_item', {
      currency,
      value: item.price,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          item_brand: item.brand,
          item_category: item.category
        }
      ]
    })
    
    // Meta
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [item.id],
        content_type: 'product',
        content_name: item.name,
        value: item.price,
        currency
      })
    }
  }

  const trackAddToCart = (item: { id: string; name: string; price: number; quantity: number; currency?: string }) => {
    const currency = item.currency || 'OMR'
    const value = item.price * item.quantity

    // GA4
    gtag('event', 'add_to_cart', {
      currency,
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity
        }
      ]
    })

    // Meta
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [item.id],
        content_type: 'product',
        content_name: item.name,
        value,
        currency
      })
    }
  }

  const trackRemoveFromCart = (item: { id: string; name: string; price: number; quantity: number; currency?: string }) => {
    const currency = item.currency || 'OMR'
    const value = item.price * item.quantity

    // GA4
    gtag('event', 'remove_from_cart', {
      currency,
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity
        }
      ]
    })
  }

  const trackBeginCheckout = (cart: { value: number; currency?: string; items: any[] }) => {
    const currency = cart.currency || 'OMR'

    // GA4
    gtag('event', 'begin_checkout', {
      currency,
      value: cart.value,
      items: cart.items.map(i => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity
      }))
    })

    // Meta
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: cart.items.map(i => i.id),
        content_type: 'product',
        value: cart.value,
        currency,
        num_items: cart.items.reduce((sum, i) => sum + i.quantity, 0)
      })
    }
  }

  const trackPurchase = (order: { transaction_id: string; value: number; currency?: string; items: any[] }) => {
    const currency = order.currency || 'OMR'
    const storageKey = `tracked_purchase_${order.transaction_id}`
    
    // Deduplicate event using localStorage
    if (localStorage.getItem(storageKey)) return;

    // GA4
    gtag('event', 'purchase', {
      transaction_id: order.transaction_id,
      currency,
      value: order.value,
      items: order.items.map(i => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity
      }))
    })

    // Meta
    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        content_ids: order.items.map(i => i.id),
        content_type: 'product',
        value: order.value,
        currency
      })
    }
    
    localStorage.setItem(storageKey, 'true');
  }

  return {
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase
  }
}
