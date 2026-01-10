// feedback.js — validate and submit to Google Forms via hidden iframe, show messages without leaving page
document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('mlp-google-form');
  if(!form) return;
  const status = document.getElementById('mlp-status');
  const iframe = document.getElementById('hidden_iframe');
  let submitting = false;

  // Prefill inputs from URL search params (handles Google Forms prefilled links)
  (function prefillFromURL(){
    if(!window.location.search) return;
    const params = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    for(const [key, value] of params.entries()){
      // only handle form fields like entry.xxxxxx
      if(!/^entry\.\d+$/.test(key)) continue;
      const decoded = decodeURIComponent(value.replace(/\+/g, ' '));
      // find matching inputs/selects/textarea in the form
      const els = form.querySelectorAll(`[name="${key}"]`);
      if(els && els.length){
        els.forEach(el=>{
          const type = el.type || el.tagName.toLowerCase();
          if(type === 'checkbox' || type === 'radio'){
            // check if the provided value matches this option's value (loose compare)
            if(el.value === decoded || el.value === decodeURIComponent(value)) el.checked = true;
          } else if(el.tagName.toLowerCase() === 'select'){
            // try to set value, add option if missing
            const opt = Array.from(el.options).find(o=>o.value === decoded);
            if(opt) el.value = decoded; else {
              const o = document.createElement('option'); o.value = decoded; o.textContent = decoded; o.selected = true; el.appendChild(o);
            }
          } else if(el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input'){
            el.value = decoded;
          }
        });
        continue;
      }

      // no direct element with that name — insert a hidden input so it's submitted
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = key; hidden.value = decoded;
      form.appendChild(hidden);
    }
  })();

  function show(msg, isError){
    status.textContent = msg;
    status.style.color = isError? '#b00020' : '#0b2545';
  }

  function validate(){
    // Validate any fields marked `required` in the form. Avoid referencing elements that may not exist.
    const required = form.querySelectorAll('[required]');
    for(const el of required){
      const tag = el.tagName.toLowerCase();
      let val = '';
      if(tag === 'input' || tag === 'textarea' || tag === 'select'){
        if(el.type === 'checkbox' || el.type === 'radio'){
          // for checkbox/radio groups, ensure at least one in the group is checked
          const name = el.name;
          const group = form.querySelectorAll(`[name="${name}"]`);
          const any = Array.from(group).some(x => x.checked);
          if(!any){ show('Please complete the required field.', true); el.focus(); return false; }
          continue;
        }
        val = el.value || '';
      }
      if(!val.trim()){ show('Please complete the required field.', true); el.focus(); return false; }
    }
    return true;
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(submitting) return;
    show('Validating...');
    if(!validate()) return;
    submitting = true;
    show('Submitting...');

    // If you deploy a serverless proxy (recommended) set window.GOOGLE_FORM_PROXY to its URL.
    const PROXY = window.GOOGLE_FORM_PROXY || null;

    if(PROXY){
      // send via fetch to your proxy which forwards to Google Forms (avoids CSP frame-ancestors). 
      const data = new FormData(form);
      const controller = new AbortController();
      const timeout = setTimeout(()=> controller.abort(), 12000);
      fetch(PROXY, { method: 'POST', body: data, signal: controller.signal })
        .then(r=> r.json())
        .then(j=>{
          clearTimeout(timeout);
          submitting = false;
          show('Thank you — your submission was received.');
          form.reset();
        })
        .catch(err=>{
          clearTimeout(timeout);
          submitting = false;
          show('Submission failed — '+(err.name==='AbortError'? 'timed out' : 'network error'), true);
        })
      return;
    }

    // Fallback: classical form submit into hidden iframe. Note: Google may block framing (CSP), causing failures.
    const timeout = setTimeout(function(){
      if(submitting){ submitting = false; show('Submission timed out — please try again.', true); }
    }, 12000);

    function loaded(){
      clearTimeout(timeout);
      submitting = false;
      show('Thank you — your submission was received.');
      form.reset();
      iframe.removeEventListener('load', loaded);
    }
    iframe.addEventListener('load', loaded);
    try{ form.submit(); }catch(err){ clearTimeout(timeout); submitting=false; show('Submission failed — try again.', true); }
  });
});
