<script lang="ts">
 let { eyebrow, title, description, action, onclick } = $props<{ eyebrow:string; title:string; description:string; action:string; onclick:()=>void }>();
</script>
<div class="page-heading"><div><p class="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><button class="primary" {onclick}>＋ {action}</button></div>

<style>
 .page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;gap:20px}.eyebrow{font-size:10px;font-weight:800;color:#718667;letter-spacing:.15em;margin:0 0 8px}.page-heading h1{font-family:Georgia,serif;font-size:35px;line-height:1.1;color:#1b2a44;margin:0 0 7px;font-weight:600}.page-heading p{margin:0;color:#747e86;font-size:14px}.primary{border:0;background:#203552;color:white;border-radius:7px;padding:11px 17px;cursor:pointer;font-weight:700}
 @media(max-width:620px){.page-heading{align-items:flex-start}.page-heading h1{font-size:29px}.page-heading>button{font-size:0;width:42px;height:42px;padding:0}.page-heading>button:before{content:"＋";font-size:19px}}
</style>
