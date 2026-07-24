const PIXEL_ID = '2066815523926231'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export default defineNuxtPlugin(() => {
  const route = useRoute()

  useHead({
    script: [
      {
        key: 'meta-pixel',
        children: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`,
      },
    ],
    noscript: [
      {
        key: 'meta-pixel-noscript',
        children: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1" />`,
      },
    ],
  })

  // The base snippet above fires the first PageView, so this watcher is
  // intentionally not `immediate` — it only covers client-side navigations.
  watch(() => route.fullPath, () => {
    window.fbq?.('track', 'PageView')
  })
})
