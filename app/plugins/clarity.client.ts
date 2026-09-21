const CLARITY_ID = 'ylc7ihjm40'

export default defineNuxtPlugin(() => {
  useHead({
    script: [
      {
        key: 'microsoft-clarity',
        type: 'text/javascript',
        innerHTML: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      },
    ],
  })
})
