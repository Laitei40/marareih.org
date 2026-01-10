(function(){
  try{
    var t = localStorage.getItem('mlp-theme');
    if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else if(t === 'light') document.documentElement.setAttribute('data-theme','light');
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme','dark');
  }catch(e){/* ignore */}
})();
