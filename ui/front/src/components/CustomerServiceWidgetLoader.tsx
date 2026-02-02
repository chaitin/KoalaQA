'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

export default function CustomerServiceWidgetLoader() {
    const pathname = usePathname()

    // Check if we are on login or register pages, or on the customer service page itself
    const isExcluded = pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/customer-service')

    return (
        <>
            {/* Hide the widget elements via CSS if we are on excluded pages
          This handles cases where the widget was already loaded (SPA navigation) */}
            {isExcluded && (
                <style jsx global>{`
          .cs-widget-button,
          .cs-widget-modal {
            display: none !important;
          }
        `}</style>
            )}

            {/* Only load the script if not on excluded pages. 
          Note: If the script fails to load or reload after navigation, 
          the widget might not appear, but usually Next.js handles Script mounting well.
          Even if we always render the script, proper hiding is ensured by the style above.
          However, optionally skipping the script when excluded saves resources on initial load.
      */}
            {!isExcluded && (
                <Script
                    src='/customer-service-widget.js'
                    strategy='lazyOnload'
                />
            )}
        </>
    )
}
