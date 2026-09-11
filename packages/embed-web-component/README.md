# monti-embed-sdk-web-component

```html
<script type="module">
  import "monti-embed-sdk-web-component";
</script>

<monti-embed
  embed-key="emb_YOUR_KEY"
  api-base="https://monti.devclub.dev/"
  position="bottom-right"
></monti-embed>
```

Events: `monti-open`, `monti-close`, `monti-ready`, `monti-error`, and `monti-destroy`. The element also exposes `open()`, `close()`, `toggle()`, `destroy()`, and `getInstance()`.
